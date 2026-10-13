"""Microservicio interno de recomendación (Laya). NO exponer a Internet."""

from fastapi import Depends, FastAPI

from .model import DecisionModel, get_model
from .schemas import RecommendRequest, RecommendResponse

app = FastAPI(title="Laya · Recomendador de servicios", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(body: RecommendRequest, model: DecisionModel = Depends(get_model)) -> RecommendResponse:
    probabilities = model.predict(body.state, body.options)
    best = max(body.options, key=lambda o: probabilities.get(o.id, 0.0))
    return RecommendResponse(
        option_id=best.id,
        option_type=best.type,
        confidence=round(probabilities[best.id], 3),
        probabilities={k: round(v, 4) for k, v in probabilities.items()},
    )
