import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def _chat(prompt: str, max_tokens: int = 600) -> str:
    response = client.chat.completions.create(
        model=MODEL,
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


def extract_concepts(text: str) -> list[dict]:
    raw = _chat(
        f"From the following explanation, identify exactly 4 to 6 terms that:\n"
        f"- Are domain-specific or technical\n"
        f"- A beginner might not fully understand\n"
        f"- Are important for grasping the core idea\n"
        f"- Are NOT common English words like 'is', 'the', 'that', 'provides', 'helps'\n\n"
        f"Return ONLY a valid JSON array. No extra text. No markdown. No code blocks.\n"
        f"Format: [{{\"term\": \"...\", \"reason\": \"...\"}}]\n\n"
        f"Explanation:\n{text}",
        max_tokens=400,
    )

    # Strip markdown code fences if model adds them
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    # Extract JSON array even if there's surrounding text
    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start != -1 and end > start:
        raw = raw[start:end]

    try:
        concepts = json.loads(raw)
        return [
            {"term": c["term"], "reason": c["reason"]}
            for c in concepts
            if isinstance(c, dict) and "term" in c and "reason" in c
        ]
    except (json.JSONDecodeError, KeyError):
        return []
