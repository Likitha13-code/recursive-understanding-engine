from fastapi import APIRouter
from models.schemas import FollowUpRequest, FollowUpResponse, ConceptTerm
from services.llm_service import generate_followup_answer_combined

router = APIRouter()

@router.post("/followup", response_model=FollowUpResponse)
async def followup(request: FollowUpRequest):
    data = await generate_followup_answer_combined(request.question, request.context, request.root_query)
    concepts = [ConceptTerm(**c) for c in data["concepts"]]
    return FollowUpResponse(answer=data["answer"], concepts=concepts)
