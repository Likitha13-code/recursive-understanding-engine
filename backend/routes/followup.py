from fastapi import APIRouter
from models.schemas import FollowUpRequest, FollowUpResponse, ConceptTerm
from services.llm_service import generate_followup_answer, extract_concepts

router = APIRouter()

@router.post("/followup", response_model=FollowUpResponse)
async def followup(request: FollowUpRequest):
    answer = generate_followup_answer(request.question, request.context, request.root_query)
    raw_concepts = extract_concepts(answer)
    concepts = [ConceptTerm(**c) for c in raw_concepts]
    return FollowUpResponse(answer=answer, concepts=concepts)
