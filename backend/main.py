from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.answer import router as answer_router
from routes.concepts import router as concepts_router
from routes.upload import router as upload_router
from routes.related import router as related_router
from routes.simplify import router as simplify_router
from routes.followup import router as followup_router
from routes.auth import router as auth_router
from routes.sessions import router as sessions_router

from db import init_db

app = FastAPI(title="Recursive Understanding Engine", version="1.0.0")

@app.on_event("startup")
def startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(answer_router, prefix="/api")
app.include_router(concepts_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(related_router, prefix="/api")
app.include_router(simplify_router, prefix="/api")
app.include_router(followup_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "RUE backend is running"}
