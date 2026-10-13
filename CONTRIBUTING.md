# Cómo contribuir

## Flujo de trabajo (Git)
1. `main` siempre desplegable y protegida (sólo entra por PR con 1 aprobación + CI verde).
2. Crear rama desde `main`: `feature/<tema>`, `fix/<tema>`, `chore/<tema>`.
3. Commits con [Conventional Commits](https://www.conventionalcommits.org/es/): `feat(turnos): ...`, `fix(senas): ...`.
4. Abrir PR completando la plantilla. Mantener los PR chicos y enfocados.

## Reglas de arquitectura (no negociables)
- **Dominio sin frameworks**: nada de NestJS ni TypeORM dentro de `*/domain/`.
- **Los casos de uso dependen de puertos** (clases abstractas), nunca de implementaciones TypeORM.
- **Controllers delgados**: validan entrada (DTO), llaman a un caso de uso y devuelven el resultado.
- **Errores de negocio** con `DomainError` y un `code` estable; nada de `throw new HttpException` en el dominio.
- **Tiempo y aleatoriedad inyectados** (`Clock`, `RandomPicker`, `IdGenerator`) para que todo sea testeable.
- Toda regla nueva lleva su test unitario.

## Estilo
- Prettier + ESLint (`npm run format`, `npm run lint`). Código en inglés, textos al usuario en español.
