import os
import json
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
TEXT_MODEL   = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _chat(prompt: str, max_tokens: int = 600) -> str:
    response = client.chat.completions.create(
        model=TEXT_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()


def generate_answer(question: str) -> str:
    return _chat(
        f"Answer the following question clearly and concisely in 3-5 sentences. "
        f"Use precise terminology but keep it accessible. Write in flowing prose, no bullet points.\n\n"
        f"Question: {question}",
        max_tokens=600,
    )


def generate_answer_with_context(question: str, context: str) -> str:
    return _chat(
        f"The user has provided the following document/content:\n\n"
        f"--- DOCUMENT START ---\n{context[:4000]}\n--- DOCUMENT END ---\n\n"
        f"Based on this document, answer the following question clearly in 3-5 sentences:\n"
        f"Question: {question}",
        max_tokens=600,
    )


def analyze_image(question: str, image_base64: str, mime_type: str) -> str:
    response = client.chat.completions.create(
        model=VISION_MODEL,
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"},
                },
                {
                    "type": "text",
                    "text": question or "Describe this image in detail and explain what it shows.",
                },
            ],
        }],
    )
    return response.choices[0].message.content.strip()


def generate_concept_explanation(term: str, parent_answer: str, exploration_path: list) -> str:
    path_context = " → ".join(exploration_path) if exploration_path else term
    return _chat(
        f"A user is learning about '{exploration_path[0] if exploration_path else term}' "
        f"and came across the term '{term}' in this explanation:\n\n"
        f"\"{parent_answer}\"\n\n"
        f"Exploration path so far: {path_context}\n\n"
        f"Explain '{term}' in 2-4 simple sentences. "
        f"Avoid circular explanations. Use plain language. "
        f"Do not reuse the exact words from the original explanation.",
        max_tokens=400,
    )


def generate_related_questions(question: str, answer: str) -> list[str]:
    raw = _chat(
        f"A user asked: '{question}'\n\n"
        f"They received this answer: '{answer[:800]}'\n\n"
        f"Generate exactly 3 follow-up questions they might ask next to deepen their understanding.\n"
        f"Return ONLY a JSON array of 3 strings. No extra text.\n"
        f"Example: [\"What is X?\", \"How does Y work?\", \"Why is Z important?\"]",
        max_tokens=200,
    )
    start, end = raw.find("["), raw.rfind("]") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
    try:
        questions = json.loads(raw)
        return [q for q in questions if isinstance(q, str)][:3]
    except (json.JSONDecodeError, KeyError):
        return []


def generate_simpler_explanation(term: str, current_explanation: str, exploration_path: list) -> str:
    return _chat(
        f"The following explanation of '{term}' may still be too complex:\n\n"
        f"\"{current_explanation}\"\n\n"
        f"Re-explain '{term}' in even simpler terms. Use an analogy or everyday example. "
        f"Write 2-3 sentences maximum. Avoid all jargon. "
        f"Imagine explaining to a 12-year-old with no technical background.",
        max_tokens=300,
    )


def generate_followup_answer(question: str, context: str, root_query: str) -> str:
    return _chat(
        f"A user is studying the topic: '{root_query}'.\n\n"
        f"They are currently reading this explanation:\n\"{context[:1500]}\"\n\n"
        f"They now ask a follow-up question: '{question}'\n\n"
        f"Answer their follow-up question in 2-4 sentences, staying within the context of the topic. "
        f"Be direct and clear. Do not repeat the explanation they already read.",
        max_tokens=400,
    )


def extract_concepts(text: str) -> list[dict]:
    raw = _chat(
        f"From the following explanation, identify exactly 4 to 6 terms that:\n"
        f"- Are domain-specific or technical\n"
        f"- A beginner might not fully understand\n"
        f"- Are important for grasping the core idea\n"
        f"- Are NOT common English words like 'is', 'the', 'that', 'provides', 'helps'\n\n"
        f"Return ONLY a valid JSON array. No extra text. No markdown. No code blocks.\n"
        f"Format: [{{\"term\": \"...\", \"reason\": \"...\", \"difficulty\": \"beginner|intermediate|advanced\"}}]\n\n"
        f"Explanation:\n{text}",
        max_tokens=500,
    )

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start != -1 and end > start:
        raw = raw[start:end]

    try:
        concepts = json.loads(raw)
        return [
            {
                "term": c["term"],
                "reason": c["reason"],
                "difficulty": c.get("difficulty", "intermediate"),
            }
            for c in concepts
            if isinstance(c, dict) and "term" in c and "reason" in c
        ]
    except (json.JSONDecodeError, KeyError):
        return []
