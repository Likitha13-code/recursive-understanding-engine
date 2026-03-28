from pydantic import BaseModel
from typing import List, Optional


class QueryRequest(BaseModel):
    question: str


class ConceptTerm(BaseModel):
    term: str
    reason: str
    difficulty: str = "intermediate"  # beginner | intermediate | advanced


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


class RelatedRequest(BaseModel):
    question: str
    answer: str


class RelatedResponse(BaseModel):
    questions: List[str]


class SimplifyRequest(BaseModel):
    term: str
    current_explanation: str
    exploration_path: Optional[List[str]] = []


class SimplifyResponse(BaseModel):
    explanation: str
    concepts: List[ConceptTerm]


class FollowUpRequest(BaseModel):
    question: str
    context: str          # the current answer/explanation text
    root_query: str       # the original root question for broad context


class FollowUpResponse(BaseModel):
    answer: str
    concepts: List[ConceptTerm]
