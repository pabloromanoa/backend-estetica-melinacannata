/**
 * Test de integración END-TO-END contra MySQL real (no usa dobles).
 * Requiere una base accesible con las credenciales del `.env` (por ej. `docker compose up -d mysql`).
 * Crea y destruye la base `<DB_NAME>_e2e`.
 *
 *   npm run test:e2e
 */
import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { createConnection } from 'mysql2/promise';
import request from 'supertest';

const DB_NAME = `${process.env.DB_NAME ?? 'estetica'}_e2e`;
const ADMIN = { email: 'admin-e2e@test.local', password: 'Admin-e2e-12345' };
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

async function recreateDatabase(): Promise<void> {
  const conn = await createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_ROOT_USER ?? process.env.DB_USERNAME,
    password: process.env.DB_ROOT_PASSWORD ?? process.env.DB_PASSWORD,
  });
  await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  await conn.query(
    `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conn.end();
}

/** Próximo día hábil (lunes a viernes) a partir de mañana, en formato YYYY-MM-DD. */
function nextWeekday(): string {
  const d = new Date();
  do d.setUTCDate(d.getUTCDate() + 1);
  while ([0, 6].includes(d.getUTCDay()));
  return d.toISOString().slice(0, 10);
}

describe('API (e2e con MySQL)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const admin = () => request.agent(app.getHttpServer());
  let adminAgent: ReturnType<typeof request.agent>;
  let serviceId: string;
  let providerId: string;
  let bookedDni: string;
  const date = nextWeekday();

  beforeAll(async () => {
    Object.assign(process.env, {
      DB_NAME,
      DB_MIGRATIONS_RUN: 'true',
      DB_SYNCHRONIZE: 'false',
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password,
      ADMIN_IS_PROVIDER: 'true',
      LAYA_URL: '',
      NOTIFICATIONS_PROVIDER: 'log',
      RECEIPTS_STORAGE_DIR: './storage/e2e-receipts',
      THROTTLE_LIMIT: '10000',
    });
    await recreateDatabase();
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    http = request(app.getHttpServer());
    adminAgent = admin();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el seeder creó el admin inicial (prestador+admin) y el login setea cookie HttpOnly', async () => {
    const res = await adminAgent.post('/api/v1/auth/login').send(ADMIN).expect(200);
    expect(res.headers['set-cookie'][0]).toMatch(/access_token=.*HttpOnly/);
    expect(res.body.data.roles).toEqual(expect.arrayContaining(['ADMIN', 'PROVIDER']));
    providerId = res.body.data.providerId;
  });

  it('rechaza endpoints protegidos sin sesión con el formato de error estándar', async () => {
    const res = await http.get('/api/v1/admin/dashboard').expect(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
  });

  it('el admin configura catálogo, servicios habilitados y horario semanal', async () => {
    const category = await adminAgent
      .post('/api/v1/admin/categories')
      .send({ name: 'Masajes', isActive: true })
      .expect(201);
    const service = await adminAgent
      .post('/api/v1/admin/services')
      .send({
        name: 'Masaje descontracturante',
        durationMinutes: 60,
        price: 20000,
        prepMinutes: 0,
        cleanupMinutes: 0,
        isActive: true,
        categoryIds: [category.body.data.id],
        providerIds: [providerId],
        recommendationTags: ['relajacion'],
        specificDates: [],
      })
      .expect(201);
    serviceId = service.body.data.id;
    expect(service.body.data.depositAmount).toBe(10000);

    const ranges = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '12:00',
    }));
    await adminAgent.put('/api/v1/staff/me/weekly-availability').send({ ranges }).expect(200);
  });

  it('catálogo y disponibilidad son públicos', async () => {
    const catalog = await http.get('/api/v1/catalog/services').expect(200);
    expect(catalog.body.data).toHaveLength(1);
    const slots = await http
      .get(`/api/v1/availability/slots?serviceId=${serviceId}&date=${date}`)
      .expect(200);
    expect(slots.body.data.slots).toHaveLength(3); // 09, 10 y 11 hs
  });

  it('flujo completo: reserva invitado → comprobante → verificación; y no permite doble reserva', async () => {
    const slots = await http.get(`/api/v1/availability/slots?serviceId=${serviceId}&date=${date}`);
    const startAt = slots.body.data.slots[0].startAt;
    const guest = { firstName: 'Flor', lastName: 'Benítez', dni: '38491024', phone: '1148291102' };

    const [a, b] = await Promise.all([
      http.post('/api/v1/appointments').send({ serviceId, startAt, guest }),
      http
        .post('/api/v1/appointments')
        .send({ serviceId, startAt, guest: { ...guest, dni: '30111222' } }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const created = a.status === 201 ? a : b;
    const token = created.body.data.guestAccessToken;
    bookedDni = created.body.data.appointment.client.dni;
    expect(created.body.data.appointment.status).toBe('CREATED');

    await http
      .post(`/api/v1/guest/appointments/${token}/receipt`)
      .attach('file', Buffer.from('no soy un pdf'), {
        filename: 'x.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);
    const informed = await http
      .post(`/api/v1/guest/appointments/${token}/receipt`)
      .attach('file', PDF, { filename: 'comprobante.pdf', contentType: 'application/pdf' })
      .expect(201);
    expect(informed.body.data.status).toBe('PAYMENT_INFORMED');

    const inbox = await adminAgent.get('/api/v1/deposits').expect(200);
    expect(inbox.body.meta.pendingAmount).toBe(10000);
    const depositId = inbox.body.data[0].id;
    const pdf = await adminAgent.get(`/api/v1/deposits/${depositId}/receipt`).expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    await http.get(`/api/v1/deposits/${depositId}/receipt`).expect(401);

    const verified = await adminAgent.post(`/api/v1/deposits/${depositId}/verify`).expect(200);
    expect(verified.body.data.status).toBe('DEPOSIT_PAID');

    const after = await http.get(`/api/v1/availability/slots?serviceId=${serviceId}&date=${date}`);
    expect(after.body.data.slots).toHaveLength(2);
  });

  it('registro con el mismo DNI vincula la reserva previa del invitado', async () => {
    const client = request.agent(app.getHttpServer());
    const res = await client
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Flor',
        lastName: 'Benítez',
        dni: bookedDni,
        phone: '1148291102',
        email: 'flor@test.local',
        password: 'secreta123',
      })
      .expect(201);
    expect(res.body.data.linkedAppointments).toBe(1);
    const mine = await client.get('/api/v1/me/appointments').expect(200);
    expect(mine.body.data.active).toHaveLength(1);
  });

  it('dashboard, informe JSON y PDF para el admin', async () => {
    const dashboard = await adminAgent.get('/api/v1/admin/dashboard').expect(200);
    expect(dashboard.body.data.daily.paymentsVerified).toBe(1);
    await adminAgent.get(`/api/v1/admin/reports/appointments?from=${date}&to=${date}`).expect(200);
    const pdf = await adminAgent
      .get(`/api/v1/admin/reports/services/pdf?from=${date}&to=${date}`)
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
  });
});
