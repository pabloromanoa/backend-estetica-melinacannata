"""
Adaptador del modelo de decisión.

`LayaModel` es el punto de integración con Laya: recibe un estado estructurado y un conjunto
FINITO de opciones, y devuelve una distribución de probabilidad sobre esas opciones.

⚠️ Mientras no esté integrado el modelo real, `HeuristicModel` implementa la misma interfaz
con un puntaje simple + softmax, para que el resto del sistema funcione de punta a punta.
Para integrar Laya: implementar `LayaModel.predict` y cambiar `get_model()`.
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod

from .schemas import Option, State


class DecisionModel(ABC):
    @abstractmethod
    def predict(self, state: State, options: list[Option]) -> dict[str, float]:
        """Devuelve {option_id: probabilidad}; la suma debe ser 1."""


def softmax(scores: dict[str, float]) -> dict[str, float]:
    top = max(scores.values())
    exp = {k: math.exp(v - top) for k, v in scores.items()}
    total = sum(exp.values())
    return {k: v / total for k, v in exp.items()}


class HeuristicModel(DecisionModel):
    """Modelo provisorio (cold start). Mismo criterio que las reglas del backend."""

    def predict(self, state: State, options: list[Option]) -> dict[str, float]:
        answers = state.answers
        scores: dict[str, float] = {}
        for option in options:
            score = 0.0
            objective = answers.get("objective")
            if objective and objective != "no_seguro" and objective in option.tags:
                score += 3
            time = answers.get("time", "any")
            if time.isdigit():
                score += 1 if option.duration_minutes <= int(time) else -2
            scope = answers.get("scope")
            if scope == "completo" and option.type == "TREATMENT":
                score += 1.5
            if scope == "puntual" and option.type == "SERVICE":
                score += 1
            if option.type == "SERVICE" and option.id in state.history:
                score += 0.5
            scores[option.id] = score
        return softmax(scores)


class LayaModel(DecisionModel):  # pragma: no cover - pendiente de integración
    def predict(self, state: State, options: list[Option]) -> dict[str, float]:
        raise NotImplementedError("Integrar aquí la inferencia de Laya")


def get_model() -> DecisionModel:
    return HeuristicModel()
