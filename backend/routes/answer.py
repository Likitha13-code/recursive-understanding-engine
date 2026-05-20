from fastapi import APIRouter, HTTPException
from models.schemas import QueryRequest, AnswerResponse, ConceptTerm
from services.llm_service import generate_answer_combined

router = APIRouter()


@router.post("/answer", response_model=AnswerResponse)
async def get_answer(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    data = await generate_answer_combined(request.question)
    concepts = [ConceptTerm(**c) for c in data["concepts"]]

    return AnswerResponse(answer=data["answer"], concepts=concepts)
