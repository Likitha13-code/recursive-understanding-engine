from fastapi import APIRouter, HTTPException
from models.schemas import ConceptRequest, ConceptResponse, ConceptTerm
from services.llm_service import generate_concept_explanation_combined

router = APIRouter()


@router.post("/explore", response_model=ConceptResponse)
async def explore_concept(request: ConceptRequest):
    if not request.term.strip():
        raise HTTPException(status_code=400, detail="Term cannot be empty.")

    depth = len(request.exploration_path) if request.exploration_path else 0

    data = await generate_concept_explanation_combined(
        term=request.term,
        parent_answer=request.parent_answer,
        exploration_path=request.exploration_path or [request.term],
    )

    concepts = [ConceptTerm(**c) for c in data["concepts"]]

    return ConceptResponse(
        term=request.term,
        explanation=data["answer"],
        concepts=concepts,
        depth_level=depth + 1,
    )
