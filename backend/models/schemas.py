from pydantic import BaseModel
from typing import List, Optional


class QueryRequest(BaseModel):
    question: str


class ConceptTerm(BaseModel):
    term: str
    reason: str


class AnswerResponse(BaseModel):
    answer: str
    concepts: List[ConceptTerm]


class ConceptRequest(BaseModel):
    term: str
    parent_answer: str
    exploration_path: Optional[List[str]] = []


class ConceptResponse(BaseModel):
    term: str
    explanation: str
    concepts: List[ConceptTerm]
    depth_level: int
