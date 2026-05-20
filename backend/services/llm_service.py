import os
import json
import base64
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
TEXT_MODEL    = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"
VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"


async def _chat_async(prompt: str, max_tokens: int = 1000) -> str:
    for model in [TEXT_MODEL, FALLBACK_MODEL]:
        try:
            response = await client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if "rate_limit" in str(e).lower() or "429" in str(e):
                print(f"[llm] Rate limit on {model}, trying fallback...")
                continue
            raise
    raise Exception("All models rate limited. Please try again later.")


def _parse_combined_json(raw: str) -> dict:
    if "```" in raw:
        parts = raw.split("```")
        if len(parts) > 1:
            raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
    
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
        
    try:
        data = json.loads(raw)
        concepts = data.get("concepts", [])
        clean_concepts = [
            {
                "term": str(c.get("term", "")),
                "reason": str(c.get("reason", "")),
                "difficulty": str(c.get("difficulty", "intermediate")),
            }
            for c in concepts
            if isinstance(c, dict) and "term" in c and "reason" in c
        ]
        return {
            "answer": data.get("answer", data.get("explanation", "")),
            "concepts": clean_concepts
        }
    except Exception:
        return {"answer": raw, "concepts": []}


async def generate_answer_combined(question: str) -> dict:
    prompt = (
        f"Answer the following question clearly and concisely in 3-5 sentences. "
        f"Use precise terminology but keep it accessible. Write in flowing prose, no bullet points.\n\n"
        f"Question: {question}\n\n"
        f"THEN, identify exactly 4 to 6 terms from your answer that:\n"
        f"- Are domain-specific or technical\n"
        f"- A beginner might not fully understand\n"
        f"- Are important for grasping the core idea\n"
        f"- Are NOT common English words like 'is', 'the', 'that', 'provides', 'helps'\n\n"
        f"Return ONLY a valid JSON object with two keys: 'answer' (your generated text) and 'concepts' (a list of objects). "
        f"Each concept object must have keys: 'term', 'reason', and 'difficulty' (beginner|intermediate|advanced).\n"
        f"Do not include any extra text or markdown formatting outside the JSON."
    )
    raw = await _chat_async(prompt, max_tokens=1000)
    return _parse_combined_json(raw)


async def generate_answer_with_context_combined(question: str, context: str) -> dict:
    prompt = (
        f"The user has provided the following document/content:\n\n"
        f"--- DOCUMENT START ---\n{context[:4000]}\n--- DOCUMENT END ---\n\n"
        f"Based on this document, answer the following question clearly in 3-5 sentences:\n"
        f"Question: {question}\n\n"
        f"THEN, identify exactly 4 to 6 technical or domain-specific terms from your answer.\n"
        f"Return ONLY a valid JSON object with keys 'answer' and 'concepts' (a list of objects with 'term', 'reason', 'difficulty' (beginner|intermediate|advanced))."
    )
    raw = await _chat_async(prompt, max_tokens=1000)
    return _parse_combined_json(raw)


async def analyze_image_combined(question: str, image_base64: str, mime_type: str) -> dict:
    response = await client.chat.completions.create(
        model=VISION_MODEL,
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"},
                },
                {
                    "type": "text",
                    "text": f"{question or 'Describe this image in detail and explain what it shows.'}\n\n"
                            f"THEN, identify 4 to 6 technical concepts from your explanation.\n"
                            f"Return ONLY a valid JSON object with 'answer' and 'concepts' (a list of objects with 'term', 'reason', 'difficulty' (beginner|intermediate|advanced)).",
                },
            ],
        }],
    )
    raw = response.choices[0].message.content.strip()
    return _parse_combined_json(raw)


async def generate_concept_explanation_combined(term: str, parent_answer: str, exploration_path: list) -> dict:
    path_context = " → ".join(exploration_path) if exploration_path else term
    prompt = (
        f"A user is learning about '{exploration_path[0] if exploration_path else term}' "
        f"and came across the term '{term}' in this explanation:\n\n"
        f"\"{parent_answer}\"\n\n"
        f"Exploration path so far: {path_context}\n\n"
        f"Explain '{term}' in 2-4 simple sentences. "
        f"Avoid circular explanations. Use plain language. "
        f"Do not reuse the exact words from the original explanation.\n\n"
        f"THEN, identify 4 to 6 new technical concepts from your explanation.\n"
        f"Return ONLY a valid JSON object with 'answer' and 'concepts' (a list of objects with 'term', 'reason', 'difficulty' (beginner|intermediate|advanced))."
    )
    raw = await _chat_async(prompt, max_tokens=1000)
    return _parse_combined_json(raw)


async def generate_simpler_explanation_combined(term: str, current_explanation: str, exploration_path: list) -> dict:
    prompt = (
        f"The following explanation of '{term}' may still be too complex:\n\n"
        f"\"{current_explanation}\"\n\n"
        f"Re-explain '{term}' in even simpler terms. Use an analogy or everyday example. "
        f"Write 2-3 sentences maximum. Avoid all jargon. Imagine explaining to a 12-year-old.\n\n"
        f"THEN, identify 2 to 4 technical concepts from your explanation (if any).\n"
        f"Return ONLY a valid JSON object with 'answer' and 'concepts' (a list of objects with 'term', 'reason', 'difficulty' (beginner|intermediate|advanced))."
    )
    raw = await _chat_async(prompt, max_tokens=1000)
    return _parse_combined_json(raw)


async def generate_followup_answer_combined(question: str, context: str, root_query: str) -> dict:
    prompt = (
        f"A user is studying the topic: '{root_query}'.\n\n"
        f"They are currently reading this explanation:\n\"{context[:1500]}\"\n\n"
        f"They now ask a follow-up question: '{question}'\n\n"
        f"Answer their follow-up question in 2-4 sentences. Be direct and clear.\n\n"
        f"THEN, identify 4 to 6 technical concepts from your answer.\n"
        f"Return ONLY a valid JSON object with 'answer' and 'concepts' (a list of objects with 'term', 'reason', 'difficulty' (beginner|intermediate|advanced))."
    )
    raw = await _chat_async(prompt, max_tokens=1000)
    return _parse_combined_json(raw)


async def generate_related_questions(question: str, answer: str) -> list[str]:
    raw = await _chat_async(
        f"A user asked: '{question}'\n\n"
        f"They received this answer: '{answer[:800]}'\n\n"
        f"Generate exactly 3 follow-up questions they might ask next to deepen their understanding.\n"
        f"Return ONLY a JSON array of 3 strings. No extra text.\n"
        f"Example: [\"What is X?\", \"How does Y work?\", \"Why is Z important?\"]",
        max_tokens=300,
    )
    start, end = raw.find("["), raw.rfind("]") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
    try:
        questions = json.loads(raw)
        return [q for q in questions if isinstance(q, str)][:3]
    except (json.JSONDecodeError, KeyError):
        return []
