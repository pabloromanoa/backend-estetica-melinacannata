# Requerimientos implementados (v1)

Fuente: `Adaptacion.docx` (solución propuesta por el equipo, alcance vigente) y `estetica_v3.pdf` (problema original).
Cuando ambos difieren, **manda `Adaptacion.docx`**.

## Roles
| Rol | Puede |
|---|---|
| Invitado | Ver catálogo, usar el recomendador, reservar (apellido, nombre, DNI, teléfono, email opcional), ver/cancelar/adjuntar comprobante por **enlace privado**. No reprograma. |
| Cliente registrado (`CLIENT`) | Todo lo anterior sin recargar datos + historial de turnos y de recomendaciones. Registro: apellido, nombre, DNI, teléfono, email y contraseña. Al registrarse con un DNI que tenía reservas como invitado, se vinculan (aviso: *"Se encontraron reservas anteriores asociadas a este DNI…"*). |
| Prestador (`PROVIDER`) | Disponibilidad semanal y excepciones, servicios que realiza, datos bancarios, su agenda, revisar/confirmar/rechazar señas, cancelar y reprogramar sus turnos con motivo, finalizar. |
| Administrador (`ADMIN`) | Catálogo, categorías, tratamientos, prestadores, agenda completa, clientes, señas, dashboard, informes PDF. **Sólo se crea por seeder/DB.** Puede ser también prestador (la dueña). |

## Reglas de negocio
1. Duración fija por servicio; distintos servicios, distintas duraciones. Tiempos de **preparación** y **limpieza** opcionales por servicio.
2. Servicios ⇄ categorías **M:N**. Desactivar categoría conserva asociaciones; eliminarla borra sólo las asociaciones.
3. Servicios habituales o sólo en **fechas específicas**.
4. Disponibilidad dinámica: horario semanal + excepciones (no disponible todo el día / rango; disponible excepcionalmente). Sin módulo de vacaciones/RRHH.
5. Horarios generados hacia adelante y hacia atrás dentro de cada hueco; sin prestador elegido se asigna **al azar** entre los libres.
6. Validación final con bloqueo antes de crear la reserva (sin dobles reservas).
7. Reserva `CREADO` bloquea **5 min**; sin comprobante → `EXPIRADO`. Con comprobante → `PAGO_INFORMADO` (ya no vence).
8. Seña = **50 %** del precio; la transferencia es externa, al alias del prestador.
9. Seña verificada → turno `SEÑADO`. Rechazada → turno `EXPIRADO` (no reutilizable; hay que reservar de nuevo).
10. Comprobantes **sólo PDF**, ≤ 5 MB, validación de MIME real y magic bytes, nombre interno, almacenamiento privado, acceso sólo autorizado.
11. Estados: `CREATED`, `PAYMENT_INFORMED`, `DEPOSIT_PAID`, `CANCELLED`, `FINISHED`, `EXPIRED`. Reprogramar no es un estado (flag + motivo). Sin historial exhaustivo.
12. Cancelación del cliente ≥ 24 h → corresponde devolución; < 24 h → pierde la seña. Cancelación del prestador → con motivo, devolución externa. Sin reglas configurables por servicio/cliente.
13. Reprogramación sólo por el personal, con motivo y revalidación del motor.
14. Recomendador: cuestionario (ilustrativo, a validar), funciona sin login; con login queda en el historial. Laya elige de un conjunto finito y devuelve confianza; nunca inventa ni reserva solo. Cada ejecución es una "foto" no editable.
15. Tratamientos = agrupación lógica de servicios; "Quiero seguir este tratamiento" guía reservas individuales (cada una con su turno/seña/comprobante).
16. WhatsApp: instrucciones post-reserva, seña confirmada/rechazada, cancelación, reprogramación, recordatorio **24 h antes** (no si se reservó con < 24 h).
17. Dashboard: actividad diaria, ocupación (día/semana, minutos libres entre turnos), actividad mensual, información económica (hoy/24 h/semana/mes, ranking por prestador). Datos en memoria del front + botón "Actualizar".
18. Informes: turnos por período, servicios, prestadores, cancelaciones, eficiencia de agenda, recomendaciones de Laya. Exportables a PDF.

## Fuera de alcance (v1)
Lista de espera, promociones, paquetes/créditos, pagos dentro del sistema, pasarela, saldos exhaustivos, cabinas/recursos físicos, reglas de cancelación configurables, reprogramación autónoma del cliente, historial exhaustivo, predicciones, permisos personalizados, creación de admins desde el front, RRHH.

## Decisiones técnicas tomadas
- **NestJS** en lugar de Express (definido por el equipo) y **TypeORM** (integración oficial, locks pesimistas para el motor).
- **React** en repo separado; contrato en `docs/api-contract.md` (copiado en ambos repos).
- Laya como microservicio Python **dentro de este repo** (`laya-service/`) y levantado por docker-compose; si no responde, el backend usa reglas expertas.
- PDF de informes con **pdfkit** (sin navegador headless). Puppeteer queda como alternativa implementando el mismo puerto.
- Zona horaria del negocio: `America/Argentina/Buenos_Aires`; la base guarda UTC.

## Preguntas abiertas para validar con la dueña / equipo
1. **Turnos cargados por el personal** ("Nueva Reserva" del panel): con 5 min de bloqueo el cliente no llega a transferir. Se dejó configurable `STAFF_BOOKING_HOLD_MINUTES` (30 min por defecto). ¿Cuál es el plazo correcto?
2. **"Pedir reenvío"** del comprobante aparece en el prototipo pero no en las reglas (hoy rechazar = expirar). ¿Se agrega un estado para reintentar?
3. El prototipo muestra comprobantes **JPG con "OCR verificado"**; las reglas dicen **sólo PDF**. Se implementó sólo PDF.
4. **Cuestionario definitivo** del recomendador y etiquetas de cada servicio.
5. **Proveedor de WhatsApp** (Cloud API de Meta requiere plantillas aprobadas para mensajes iniciados por la empresa).
6. **Sedes** (el prototipo muestra "Sede Belgrano/Recoleta"): no están en el alcance; ¿se necesitan?
7. Recuperación de contraseña ("olvidé mi contraseña") no figura en `Adaptacion.docx` (sí en el PDF original).
8. Anticipación mínima para reservar (hoy: desde el próximo cuarto de hora).
