from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.answer import router as answer_router
from routes.concepts import router as concepts_router

app = FastAPI(title="Recursive Understanding Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(answer_router, prefix="/api")
app.include_router(concepts_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "RUE backend is running"}
