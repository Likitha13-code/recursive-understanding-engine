from fastapi import APIRouter, HTTPException
from models.schemas import ConceptRequest, ConceptResponse, ConceptTerm
from services.llm_service import generate_concept_explanation, extract_concepts

router = APIRouter()


@router.post("/explore", response_model=ConceptResponse)
async def explore_concept(request: ConceptRequest):
    if not request.term.strip():
        raise HTTPException(status_code=400, detail="Term cannot be empty.")

    depth = len(request.exploration_path) if request.exploration_path else 0

    explanation = generate_concept_explanation(
        term=request.term,
        parent_answer=request.parent_answer,
        exploration_path=request.exploration_path or [request.term],
    )

    raw_concepts = extract_concepts(explanation)
    concepts = [ConceptTerm(**c) for c in raw_concepts]

    return ConceptResponse(
        term=request.term,
        explanation=explanation,
        concepts=concepts,
        depth_level=depth + 1,
    )
