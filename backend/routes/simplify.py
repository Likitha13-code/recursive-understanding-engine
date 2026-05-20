from fastapi import APIRouter
from models.schemas import SimplifyRequest, SimplifyResponse, ConceptTerm
from services.llm_service import generate_simpler_explanation_combined

router = APIRouter()

@router.post("/simplify", response_model=SimplifyResponse)
async def simplify(request: SimplifyRequest):
    data = await generate_simpler_explanation_combined(
        request.term,
        request.current_explanation,
        request.exploration_path or [],
    )
    concepts = [ConceptTerm(**c) for c in data["concepts"]]
    return SimplifyResponse(explanation=data["answer"], concepts=concepts)
