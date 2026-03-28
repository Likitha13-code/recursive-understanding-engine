from fastapi import APIRouter
from models.schemas import SimplifyRequest, SimplifyResponse, ConceptTerm
from services.llm_service import generate_simpler_explanation, extract_concepts

router = APIRouter()

@router.post("/simplify", response_model=SimplifyResponse)
async def simplify(request: SimplifyRequest):
    explanation = generate_simpler_explanation(
        request.term,
        request.current_explanation,
        request.exploration_path or [],
    )
    raw_concepts = extract_concepts(explanation)
    concepts = [ConceptTerm(**c) for c in raw_concepts]
    return SimplifyResponse(explanation=explanation, concepts=concepts)
