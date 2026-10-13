# Contrato de API v1 — Melina Cannata Salud & Estética

> Fuente de verdad compartida entre `backend-estetica-melinacannata` y `frontend-estetica-melinacannata`.
> Si cambiás un endpoint, actualizá este archivo **en ambos repos** en el mismo PR.
> La documentación interactiva (Swagger) está en `GET /api/docs` cuando el backend corre.

## Convenciones

| Tema | Regla |
|------|-------|
| Base URL | `/api/v1` |
| Auth | JWT en cookie **HttpOnly** `access_token` (SameSite=Lax, Secure en prod). El frontend usa `credentials: 'include'`. Nunca se guarda el token en localStorage. |
| Éxito | `{ "data": T }` o `{ "data": T[], "meta": { "total": n } }` |
| Error | `{ "error": { "code": "APPOINTMENT_SLOT_TAKEN", "message": "texto para el usuario", "details"?: any } }` |
| Fechas-hora | ISO 8601 en UTC (`2026-10-25T17:30:00.000Z`). El frontend las muestra en `America/Argentina/Buenos_Aires`. |
| Fechas (día) | `YYYY-MM-DD` interpretadas en la zona horaria del negocio. |
| Horas | `HH:mm` (24h) en la zona horaria del negocio. |
| Dinero | `number` en ARS (2 decimales máx). |
| IDs | UUID v4 (`string`). |

### Roles
`CLIENT` (cliente registrado), `PROVIDER` (prestador), `ADMIN`. Un usuario puede tener `PROVIDER` y `ADMIN` a la vez.
Invitado = sin sesión.

### Estados del turno (`AppointmentStatus`)
| Código | Etiqueta UI | Ocupa la agenda |
|--------|-------------|-----------------|
| `CREATED` | Creado (reserva temporal 5 min) | Sí, mientras `holdExpiresAt > ahora` |
| `PAYMENT_INFORMED` | Pago informado / Por validar | Sí |
| `DEPOSIT_PAID` | Señado | Sí |
| `FINISHED` | Finalizado | Sí |
| `CANCELLED` | Cancelado | No |
| `EXPIRED` | Expirado | No |

### Estados de la seña (`DepositStatus`)
`PENDING` (Pendiente) · `VERIFIED` (Verificada) · `REJECTED` (Rechazada)

### Resultado de cancelación (`DepositOutcome`)
`REFUND` (corresponde devolver seña, se gestiona fuera del sistema) · `FORFEIT` (pierde la seña) · `NOT_APPLICABLE` (no había seña verificada)

### Códigos de error frecuentes
`LOGIN_REQUIRED` (un invitado usó el DNI de una cuenta registrada), `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_CREDENTIALS`, `EMAIL_ALREADY_REGISTERED`, `DNI_ALREADY_REGISTERED`,
`SLOT_NOT_AVAILABLE`, `PROVIDER_NOT_QUALIFIED`, `HOLD_EXPIRED`, `INVALID_STATUS_TRANSITION`, `INVALID_RECEIPT_FILE`, `CANCELLATION_REASON_REQUIRED`, `TOO_MANY_REQUESTS`.

---

## Tipos compartidos

```ts
type Role = 'CLIENT' | 'PROVIDER' | 'ADMIN';

interface SessionUser {
  id: string; email: string; firstName: string; lastName: string;
  roles: Role[]; providerId: string | null; clientId: string | null;
}

interface Category { id: string; name: string; isActive: boolean }

interface ProviderSummary { id: string; displayName: string; specialty: string | null; avatarUrl: string | null }

interface Service {
  id: string; name: string; description: string | null; imageUrl: string | null;
  durationMinutes: number; price: number; depositAmount: number; // 50% del precio
  prepMinutes: number; cleanupMinutes: number; isActive: boolean;
  recommendationTags: string[]; specificDates: string[];        // [] = se presta habitualmente
  categories: Category[]; providers: ProviderSummary[];
}

interface Treatment {
  id: string; name: string; description: string | null; isActive: boolean;
  recommendationTags: string[]; services: Service[];            // ordenados
}

interface BankDetails { alias: string | null; cbu: string | null; holder: string | null; cuil: string | null; bankName: string | null }

interface Provider extends ProviderSummary {
  userId: string; email: string; isActive: boolean; bio: string | null;
  bankDetails: BankDetails; serviceIds: string[];
}

interface WeeklyAvailabilityRange { dayOfWeek: 0|1|2|3|4|5|6; startTime: string; endTime: string } // 0 = domingo

interface AvailabilityException {
  id: string; date: string;                         // YYYY-MM-DD
  type: 'UNAVAILABLE' | 'AVAILABLE';
  startTime: string | null; endTime: string | null; // null+null en UNAVAILABLE = todo el día
  reason: string | null;
}

interface ClientSummary { id: string; firstName: string; lastName: string; dni: string; phone: string; email: string | null; hasAccount: boolean }

interface Deposit {
  id: string; appointmentId: string; amount: number; status: 'PENDING'|'VERIFIED'|'REJECTED';
  uploadedAt: string; reviewedAt: string | null; rejectionReason: string | null;
}

interface Appointment {
  id: string; code: string;                    // ej. "TRN-8841"
  status: AppointmentStatus;
  startAt: string; endAt: string;              // duración del servicio (sin prep/limpieza)
  holdExpiresAt: string | null;                // sólo en CREATED
  price: number; depositAmount: number; remainingAmount: number;
  service: { id: string; name: string; durationMinutes: number };
  provider: ProviderSummary & { bankDetails: BankDetails };
  client: ClientSummary;
  deposit: Deposit | null;                     // último comprobante informado
  rescheduled: boolean; rescheduleReason: string | null;
  cancellationReason: string | null; cancelledBy: 'CLIENT'|'PROVIDER'|'ADMIN'|null;
  depositOutcome: DepositOutcome | null; createdAt: string;
}

interface AvailableSlot {
  startAt: string; endAt: string;
  providers: ProviderSummary[];   // quiénes pueden atender en ese horario exacto
  contiguous: boolean;            // true = pegado a otro turno/borde de jornada → "Turno continuo sin demoras"
}
```

---

## Auth — `/auth`

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| POST | `/auth/register` | — (rate limit) | `{ firstName, lastName, dni, phone, email, password }` (password ≥ 8) | `201 { data: { user: SessionUser, linkedAppointments: number } }` + set-cookie |
| POST | `/auth/login` | — (rate limit) | `{ email, password }` | `200 { data: SessionUser }` + set-cookie |
| POST | `/auth/logout` | cualquiera | — | `204` (borra cookie) |
| GET | `/auth/me` | sesión | — | `{ data: SessionUser }` |

`linkedAppointments > 0` ⇒ el front muestra *"Se encontraron reservas anteriores asociadas a este DNI. Serán incorporadas a tu historial."*

## Catálogo público — `/catalog`

| Método | Ruta | Query | Respuesta |
|--------|------|-------|-----------|
| GET | `/catalog/categories` | — | `Category[]` (sólo activas) |
| GET | `/catalog/services` | `categoryId?`, `search?` | `Service[]` (sólo activos) |
| GET | `/catalog/services/:id` | — | `Service` |
| GET | `/catalog/treatments/:id` | — | `Treatment` |

## Disponibilidad — `/availability`

| Método | Ruta | Query | Respuesta |
|--------|------|-------|-----------|
| GET | `/availability/slots` | `serviceId` (req), `date` YYYY-MM-DD (req), `providerId?` | `{ data: { date, serviceId, slots: AvailableSlot[] } }` |
| GET | `/availability/next-slots` | `serviceId`, `providerId?`, `fromDate?`, `days?` (def 7, máx 31), `limit?` (def 10) | `{ data: AvailableSlot[] }` (sugerencias de próximos días) |

## Turnos — `/appointments`

| Método | Ruta | Auth | Body / Query | Respuesta / Notas |
|--------|------|------|--------------|-------------------|
| POST | `/appointments` | opcional | `{ serviceId, startAt, providerId?, guest?: { firstName, lastName, dni, phone, email? }, recommendationId? }` | `201 { data: { appointment: Appointment, guestAccessToken: string \| null } }`. Sin sesión ⇒ `guest` obligatorio. Con `ADMIN/PROVIDER` se puede reservar a nombre de un cliente pasando `guest` (datos del paciente) — "Nueva Reserva" del panel. Sin `providerId` se asigna aleatoriamente entre los disponibles. Estado inicial `CREATED`, `holdExpiresAt = ahora + 5 min`. |
| POST | `/appointments/:id/receipt` | dueño del turno (cliente) o staff | `multipart/form-data` campo `file` (PDF ≤ 5MB) | `{ data: Appointment }` → `PAYMENT_INFORMED`. Error `HOLD_EXPIRED` si pasaron los 5 min. |
| GET | `/appointments` | ADMIN / PROVIDER | `from`, `to` (ISO, rango máx. 120 días), `providerId?`, `status?` (csv), `search?` (nombre, teléfono, DNI o código) | `Appointment[]`. PROVIDER sólo ve los suyos. |
| GET | `/appointments/:id` | dueño / staff | — | `Appointment` |
| POST | `/appointments/:id/cancel` | dueño / PROVIDER asignado / ADMIN | `{ reason? }` (obligatorio para staff) | `{ data: Appointment }` con `depositOutcome` |
| POST | `/appointments/:id/reschedule` | PROVIDER asignado / ADMIN | `{ startAt, providerId?, reason }` | `{ data: Appointment }` (revalida con el motor) |
| POST | `/appointments/:id/finish` | PROVIDER asignado / ADMIN | — | `{ data: Appointment }` (sólo desde `DEPOSIT_PAID`) |

### Acceso de invitado (enlace privado) — `/guest/appointments`
El enlace privado es `${FRONTEND_URL}/turno/{token}`.

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/guest/appointments/:token` | — | `Appointment` |
| POST | `/guest/appointments/:token/receipt` | multipart `file` | `Appointment` |
| POST | `/guest/appointments/:token/cancel` | `{ reason? }` | `Appointment` |

## Portal del cliente — `/me` (rol CLIENT)

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/me/appointments` | `{ data: { active: Appointment[], history: Appointment[] } }` |
| GET | `/me/recommendations` | `Recommendation[]` |

## Señas — `/deposits` (ADMIN / PROVIDER)

| Método | Ruta | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET | `/deposits` | `status?` (def `PENDING`) | `{ data: DepositInboxItem[], meta: { total, pendingAmount } }` donde `DepositInboxItem = Deposit & { appointment: Appointment }`. PROVIDER sólo los suyos. |
| GET | `/deposits/:id/receipt` | — | `application/pdf` (stream, sólo autorizados) |
| POST | `/deposits/:id/verify` | — | `{ data: Appointment }` → seña `VERIFIED`, turno `DEPOSIT_PAID` |
| POST | `/deposits/:id/reject` | `{ reason }` | `{ data: Appointment }` → seña `REJECTED`, turno `EXPIRED` |

## Agenda del staff — `/agenda`

| Método | Ruta | Query | Respuesta |
|--------|------|-------|-----------|
| GET | `/agenda/day` | `date` | `{ data: { date, providers: Array<ProviderSummary & { workingRanges: {startTime,endTime}[], appointments: Appointment[] }>, summary: { appointments, capacityMinutes, bookedMinutes, pendingDeposits, freeGaps } } }` (ADMIN ve todos, PROVIDER sólo su columna) |

## Prestador (yo) — `/staff/me` (rol PROVIDER)
y su equivalente de administración `/admin/providers/:providerId/...` (rol ADMIN) con las mismas sub-rutas.

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/staff/me` | — | `Provider` |
| PUT | `/staff/me/bank-details` | `BankDetails` | `Provider` |
| PUT | `/staff/me/services` | `{ serviceIds: string[] }` | `Provider` |
| GET | `/staff/me/weekly-availability` | — | `WeeklyAvailabilityRange[]` |
| PUT | `/staff/me/weekly-availability` | `{ ranges: WeeklyAvailabilityRange[] }` (reemplaza todo) | `WeeklyAvailabilityRange[]` |
| GET | `/staff/me/exceptions` | `from?`, `to?` | `AvailabilityException[]` |
| POST | `/staff/me/exceptions` | `Omit<AvailabilityException,'id'>` | `AvailabilityException` |
| DELETE | `/staff/me/exceptions/:id` | — | `204` |

## Administración — `/admin` (rol ADMIN)

| Método | Ruta | Notas |
|--------|------|-------|
| GET/POST | `/admin/services` | listar (incluye inactivos) / crear `{ name, description?, imageUrl?, durationMinutes, price, prepMinutes, cleanupMinutes, categoryIds, providerIds, recommendationTags, specificDates, isActive }` |
| GET/PUT | `/admin/services/:id` | ver / editar (mismo body) |
| GET/POST | `/admin/categories` | `{ name, isActive }` |
| PUT/DELETE | `/admin/categories/:id` | DELETE elimina la categoría y **sólo** sus asociaciones; los servicios quedan intactos |
| GET/POST | `/admin/treatments` | `{ name, description?, serviceIds (ordenados), recommendationTags, isActive }` |
| GET/PUT | `/admin/treatments/:id` | ver / editar |
| GET/POST | `/admin/providers` | crear: `{ firstName, lastName, email, password, displayName, specialty?, bio?, avatarUrl? }` — crea usuario con rol PROVIDER. El rol ADMIN **nunca** se asigna desde la API (sólo seeder/DB). |
| GET/PUT | `/admin/providers/:id` | ver (`Provider`) / editar `{ displayName, specialty?, bio?, avatarUrl?, isActive }` |
| `...` | `/admin/providers/:id/{bank-details,services,weekly-availability,exceptions}` | igual que `/staff/me/*` |
| GET | `/admin/clients` | `search?` (nombre, DNI o teléfono) → `ClientSummary[]` |
| GET | `/admin/clients/:id` | `ClientSummary & { appointments: Appointment[] }` |
| GET | `/admin/dashboard` | ver abajo |
| GET | `/admin/reports/:type` | `type ∈ appointments \| services \| providers \| cancellations \| agenda-efficiency \| recommendations`, query `from`, `to` (YYYY-MM-DD) → JSON |
| GET | `/admin/reports/:type/pdf` | mismo query → `application/pdf` (descarga) |

### Dashboard
```ts
interface Dashboard {
  generatedAt: string;
  daily: { appointmentsToday: number; paymentsInformed: number; paymentsVerified: number; paymentsRejected: number; paymentsPendingReview: number; cancellationsToday: number };
  occupancy: { todayPercent: number; weekPercent: number; freeMinutesBetweenAppointmentsToday: number };
  monthly: { servicesPerformed: number; topService: { id: string; name: string; count: number } | null; uniqueClients: number };
  economic: {
    servicesValue: { today: number; last24h: number; week: number; month: number };
    verifiedDeposits: { today: number; last24h: number; week: number; month: number };
    byProvider: Array<{ providerId: string; displayName: string; value: number; appointments: number }>;
  };
}
```

### Informes (`GET /admin/reports/:type`)
```ts
interface ReportResult {
  type: string; title: string; from: string; to: string; generatedAt: string;
  summary: { label: string; value: string | number }[];
  tables: { title: string; columns: string[]; rows: (string | number)[][] }[];
}
```

## Recomendaciones (Laya) — `/recommendations`

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| GET | `/recommendations/questionnaire` | — | — | `{ data: Question[] }` con `Question = { id, text, options: { value, label }[] }` |
| POST | `/recommendations` | opcional | `{ answers: Record<questionId, value> }` | `{ data: Recommendation }` |
| POST | `/recommendations/:id/outcome` | opcional | `{ outcome: 'ACCEPTED' \| 'DISCARDED' }` | `{ data: Recommendation }` |

```ts
interface Recommendation {
  id: string; createdAt: string; answers: Record<string, string>;
  type: 'SERVICE' | 'TREATMENT'; confidence: number; source: 'LAYA' | 'RULES';
  service: Service | null; treatment: Treatment | null;   // confidence ∈ [0, 1]
  outcome: 'PENDING' | 'ACCEPTED' | 'DISCARDED'; ledToBooking: boolean;
}
```
