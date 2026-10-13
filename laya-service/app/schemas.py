"""Contrato del servicio interno de recomendación (consumido sólo por el backend NestJS)."""

from typing import Literal

from pydantic import BaseModel, Field

OptionType = Literal["SERVICE", "TREATMENT"]


class Option(BaseModel):
    id: str
    type: OptionType
    tags: list[str] = Field(default_factory=list)
    duration_minutes: int = Field(ge=0)


class State(BaseModel):
    answers: dict[str, str]
    history: list[str] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    state: State
    options: list[Option] = Field(min_length=1)


class RecommendResponse(BaseModel):
    option_id: str
    option_type: OptionType
    confidence: float = Field(ge=0, le=1)
    probabilities: dict[str, float]
