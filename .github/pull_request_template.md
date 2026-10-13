## ¿Qué cambia?

<!-- Descripción breve y motivo. Link al issue/tarea. -->

## Tipo
- [ ] feat  - [ ] fix  - [ ] refactor  - [ ] test  - [ ] docs  - [ ] chore

## Checklist
- [ ] La lógica de negocio está en `domain/` o `application/` (no en controllers ni repositorios)
- [ ] Tests unitarios para reglas nuevas / modificadas (`npm test`)
- [ ] `npm run lint` y `npm run typecheck` sin errores
- [ ] Si cambia el esquema: migración generada (`npm run migration:generate --name=...`)
- [ ] Si cambia un endpoint: actualizado `docs/api-contract.md` **en ambos repos**
- [ ] Variables de entorno nuevas agregadas a `.env.example`
