import base64
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import AnswerResponse, ConceptTerm
from services.llm_service import generate_answer_with_context, analyze_image, extract_concepts

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "text/plain",
}


@router.post("/upload", response_model=AnswerResponse)
async def upload_file(
    file: UploadFile = File(...),
    question: str = Form(default="Summarize this document."),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    contents = await file.read()

    # ── Image ──────────────────────────────────────────────
    if file.content_type.startswith("image/"):
        image_b64 = base64.b64encode(contents).decode("utf-8")
        answer = analyze_image(question, image_b64, file.content_type)

    # ── PDF ────────────────────────────────────────────────
    elif file.content_type == "application/pdf":
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(contents))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            if not text.strip():
                raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
            answer = generate_answer_with_context(question, text)
        except ImportError:
            raise HTTPException(status_code=500, detail="PyPDF2 not installed.")

    # ── Plain text ─────────────────────────────────────────
    else:
        text = contents.decode("utf-8", errors="ignore")
        answer = generate_answer_with_context(question, text)

    raw_concepts = extract_concepts(answer)
    concepts = [ConceptTerm(**c) for c in raw_concepts]
    return AnswerResponse(answer=answer, concepts=concepts)
