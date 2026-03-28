from fastapi import APIRouter
from models.schemas import RelatedRequest, RelatedResponse
from services.llm_service import generate_related_questions

router = APIRouter()

@router.post("/related", response_model=RelatedResponse)
async def get_related(request: RelatedRequest):
    questions = generate_related_questions(request.question, request.answer)
    return RelatedResponse(questions=questions)
