from fastapi import APIRouter, HTTPException
from models.schemas import QueryRequest, AnswerResponse, ConceptTerm
from services.llm_service import generate_answer, extract_concepts

router = APIRouter()


@router.post("/answer", response_model=AnswerResponse)
async def get_answer(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    answer = generate_answer(request.question)
    raw_concepts = extract_concepts(answer)
    concepts = [ConceptTerm(**c) for c in raw_concepts]

    return AnswerResponse(answer=answer, concepts=concepts)
