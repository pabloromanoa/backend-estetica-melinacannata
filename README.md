# backend-estetica-melinacannata

API REST del **Sistema de Gestión Integral de Turnos** para *Melina Cannata — Salud & Estética Integral*.
NestJS + TypeScript + MySQL (TypeORM), con arquitectura limpia (hexagonal) por módulos, principios SOLID y tests con Jest.

> Frontend: repo [`frontend-estetica-melinacannata`](../frontend-estetica-melinacannata).
> Contrato compartido: [`docs/api-contract.md`](docs/api-contract.md) · Swagger en `http://localhost:3000/api/docs`.

---

## Índice
1. [Qué resuelve](#qué-resuelve)
2. [Stack](#stack)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Scripts](#scripts)
5. [Arquitectura](#arquitectura)
6. [Motor de disponibilidad](#motor-de-disponibilidad)
7. [Seguridad](#seguridad)
8. [Testing](#testing)
9. [Decisiones y pendientes](#decisiones-y-pendientes)

---

## Qué resuelve

| Módulo | Responsabilidad |
|---|---|
| `identity` | Cuentas, clientes (invitados por DNI), registro con vinculación de reservas previas, login con cookie JWT HttpOnly, guard global de sesión y roles. |
| `catalog` | Servicios (duración, precio, prep/limpieza, fechas específicas, etiquetas de recomendación), categorías M:N, tratamientos y prestadores habilitados. |
| `staff` | Prestadores: perfil, datos bancarios para la seña, servicios que realiza, horario semanal y excepciones. |
| `scheduling` | **Motor de disponibilidad**, reservas con bloqueo de 5 min, comprobantes PDF, verificación/rechazo de señas, cancelación (política 24 h), reprogramación, agenda diaria, portal del cliente, enlace privado de invitado y tareas programadas. |
| `recommendations` | Cuestionario + recomendador híbrido **Laya → reglas** con registro auditable. |
| `notifications` | Mensajes de WhatsApp detrás de un puerto (`log` en dev, `whatsapp-cloud` como adaptador inicial). |
| `reporting` | Dashboard del admin e informes (JSON + PDF). |
| `laya-service/` | Microservicio interno Python/FastAPI para Laya (ver su README). |

Las reglas de negocio completas están resumidas en [`docs/requerimientos.md`](docs/requerimientos.md).

## Stack

- **Node 22**, **NestJS 11**, TypeScript estricto
- **MySQL 8.4** (compatible MariaDB 10.11+) con **TypeORM 0.3** y migraciones
- Auth: **JWT en cookie HttpOnly** (SameSite=Lax, Secure en prod), **Argon2id** para contraseñas
- Seguridad HTTP: **Helmet**, **CORS** restringido, **rate limiting** (`@nestjs/throttler`), `ValidationPipe` con whitelist
- Archivos: Multer en memoria + validación propia (tamaño, extensión, MIME y *magic bytes*), almacenamiento privado
- Tareas programadas: `@nestjs/schedule` (expiración de reservas y recordatorio 24 h)
- PDF de informes: `pdfkit`
- Tests: **Jest** (unitarios) + **Supertest** (e2e contra MySQL real)
- Documentación: Swagger (`@nestjs/swagger`)

## Puesta en marcha

Requisitos: Node 22 (`nvm use`), Docker Desktop.

```bash
cp .env.example .env            # completar JWT_SECRET y ADMIN_PASSWORD
docker compose up -d mysql laya # base de datos + servicio Laya
npm install
npm run start:dev               # aplica migraciones y crea el admin inicial
npm run seed:demo               # (opcional) servicios, prestadoras y horarios de demo
```

- API: `http://localhost:3000/api/v1` — Health: `GET /api/v1/health`
- Swagger: `http://localhost:3000/api/docs` (sólo fuera de producción)
- Admin inicial: `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env` (seeder **idempotente**: si ya hay un admin, no hace nada).
- Prestadoras demo (`seed:demo`): `camila@demo.local`, `sofia@demo.local`, `valeria@demo.local` — clave `Demo12345!`.

Todo en contenedores: `docker compose up -d --build`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run start:dev` | Desarrollo con hot reload |
| `npm run build` / `start:prod` | Compilar / ejecutar build |
| `npm test` / `npm run test:cov` | Tests unitarios (con cobertura; umbral 85 % en los `domain/` críticos) |
| `npm run test:e2e` | Tests end-to-end con Supertest contra MySQL (crea y borra `<DB_NAME>_e2e`) |
| `npm run lint` / `typecheck` / `format` | Calidad de código |
| `npm run migration:generate --name=Algo` | Genera una migración a partir de los cambios en entidades |
| `npm run migration:run` / `migration:revert` | Aplica / revierte migraciones |
| `npm run seed:demo` | Datos de demostración |

## Arquitectura

Cada módulo sigue la misma estructura (arquitectura hexagonal / *ports & adapters*):

```
src/modules/<modulo>/
├── domain/          Reglas de negocio PURAS: entidades, value objects, políticas y PUERTOS
│                    (clases abstractas). Sin NestJS, sin TypeORM, sin HTTP. 100 % testeable.
├── application/     Casos de uso: orquestan dominio + puertos. Dependen de abstracciones.
├── infrastructure/  Adaptadores: entidades/repositorios TypeORM, storage, HTTP a Laya, WhatsApp, PDF…
├── presentation/    Controllers + DTOs (validación de entrada). Delgados: llaman a un caso de uso.
└── <modulo>.module.ts  Wiring de NestJS: `{ provide: Puerto, useClass: Adaptador }`
```

```
src/shared/
├── domain/          Interval (álgebra de rangos), BusinessTime (zona horaria), Clock, IdGenerator,
│                    BookingPolicy, Role/Actor, DomainError
├── application/     UnitOfWork (puerto transaccional)
└── infrastructure/  CoreModule, TransactionContext (AsyncLocalStorage), filtro de errores,
                     interceptor de respuesta `{ data }`, decoradores @Public/@Roles/@CurrentActor
```

**SOLID aplicado**

- **S** — un caso de uso por clase (`BookAppointmentUseCase`, `UploadReceiptUseCase`, …); el agregado `Appointment` sólo maneja su máquina de estados; la política de cancelación es una función aparte.
- **O** — nuevos proveedores (WhatsApp, almacenamiento S3, modelo Laya real, PDF con Puppeteer) se agregan implementando un puerto, sin tocar casos de uso.
- **L** — los adaptadores en memoria de los tests y los TypeORM son intercambiables.
- **I** — puertos chicos y específicos (`ReceiptStorage`, `GuestTokenService`, `RandomPicker`, `ReportingDataSource`…).
- **D** — la capa de aplicación depende de clases abstractas; Nest inyecta la implementación concreta.

**Modelo de lectura separado (CQRS liviano):** las escrituras usan agregados (`Appointment`, `Deposit`); las lecturas para la API usan `AppointmentReadModel` con joins (sin N+1).

**Errores:** el dominio lanza `DomainError` con un `code` estable; `DomainExceptionFilter` lo traduce a HTTP con el formato `{ error: { code, message, details } }`.

## Motor de disponibilidad

`src/modules/scheduling/domain/availability-engine.ts` (funciones puras, ver tests):

1. Jornada del prestador para la fecha = horario semanal **−/reemplazado por** excepciones (`staff/domain/working-schedule.ts`).
2. Huecos libres = jornada − rangos bloqueados por turnos (incluyen **preparación** antes y **limpieza** después).
3. En cada hueco se proponen horarios **hacia adelante** desde el inicio y **hacia atrás** desde el final, encadenando bloques; se unen y deduplican. Los pegados a un borde se marcan `contiguous` ("Turno continuo sin demoras").
4. Sin prestador elegido se combinan todos los habilitados y, al confirmar, se asigna **al azar** entre los libres en ese horario exacto.
5. **Anti doble reserva:** la reserva corre en una transacción `READ COMMITTED` que primero toma `SELECT … FOR UPDATE` sobre las filas de los prestadores candidatos y recién ahí revalida la disponibilidad.
6. Turno `CREATED` bloquea el horario 5 min (`holdExpiresAt`); el motor ya lo ignora al vencer y un job lo pasa a `EXPIRED`.

## Seguridad

- Todo endpoint requiere sesión **por defecto**; lo público se marca explícitamente con `@Public()` / `@OptionalAuth()`.
- No existe endpoint para crear administradores ni asignar el rol ADMIN (sólo el seeder o la base).
- Contraseñas con Argon2id; token sólo en cookie HttpOnly; rate limit estricto en login/registro.
- Enlace de invitado: token aleatorio de 256 bits; en la base sólo se guarda su **hash SHA-256**.
- Comprobantes: ≤ 5 MB, `.pdf`, MIME `application/pdf` **y** firma `%PDF-`; nombre interno UUID; directorio privado con permisos 0600; descarga sólo para el prestador asignado o un admin, con `nosniff`.

## Testing

- **Unitarios** (`*.spec.ts` junto al código): motor de disponibilidad, horarios/excepciones, máquina de estados del turno, política de 24 h, validación de comprobantes, ocupación, recomendador, informes y casos de uso completos (reserva, concurrencia, comprobante, verificación, rechazo, cancelación, jobs) con repositorios en memoria (`test/support`).
- **E2E** (`test/api.e2e-spec.ts`): levanta la app completa contra MySQL y recorre el flujo real (incluye dos reservas simultáneas del mismo horario → una 201 y otra 409).
- `laya-service`: `pytest`.

## Decisiones y pendientes

Ver la sección final de [`docs/requerimientos.md`](docs/requerimientos.md) (decisiones tomadas y preguntas abiertas para validar con el negocio).
