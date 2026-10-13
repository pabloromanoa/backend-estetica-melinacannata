from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

OPTIONS = [
    {"id": "masaje", "type": "SERVICE", "tags": ["relajacion"], "duration_minutes": 60},
    {"id": "limpieza", "type": "SERVICE", "tags": ["limpieza"], "duration_minutes": 60},
    {"id": "facial", "type": "TREATMENT", "tags": ["limpieza"], "duration_minutes": 180},
]


def post(answers, options=OPTIONS):
    return client.post("/recommend", json={"state": {"answers": answers}, "options": options})


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_recomienda_segun_objetivo_y_tiempo():
    res = post({"objective": "relajacion", "time": "60", "scope": "puntual"})
    assert res.status_code == 200
    body = res.json()
    assert body["option_id"] == "masaje"
    assert 0 < body["confidence"] <= 1
    assert abs(sum(body["probabilities"].values()) - 1) < 0.01


def test_solo_elige_opciones_del_catalogo():
    body = post({"objective": "limpieza", "time": "any", "scope": "completo"}).json()
    assert body["option_id"] in {o["id"] for o in OPTIONS}
    assert body["option_id"] == "facial"


def test_requiere_al_menos_una_opcion():
    assert post({"objective": "x"}, options=[]).status_code == 422
