# laya-service

Microservicio **interno** (Python + FastAPI) que ejecuta el modelo de recomendación Laya.
Sólo lo consume el backend NestJS (`LAYA_URL`); **no debe exponerse a Internet**.

- `POST /recommend` → recibe `{ state: { answers, history }, options: [...] }` y devuelve
  `{ option_id, option_type, confidence, probabilities }`, eligiendo SIEMPRE una opción del conjunto recibido.
- `GET /health`

Hoy usa `HeuristicModel` (puntaje + softmax) como modelo provisorio. Para integrar Laya,
implementar `LayaModel.predict` en `app/model.py` y devolverlo en `get_model()`.
Si este servicio no responde, el backend usa automáticamente su motor de reglas.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
pytest
```
