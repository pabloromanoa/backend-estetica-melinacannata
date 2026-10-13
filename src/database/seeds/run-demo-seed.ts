/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ManageCategoriesUseCase } from '../../modules/catalog/application/manage-categories.use-case';
import { ManageServicesUseCase } from '../../modules/catalog/application/manage-services.use-case';
import { ManageTreatmentsUseCase } from '../../modules/catalog/application/manage-treatments.use-case';
import { ServiceRepository } from '../../modules/catalog/domain/catalog.repositories';
import { WeeklyAvailabilityRange } from '../../modules/staff/domain/availability';
import { AvailabilityUseCases } from '../../modules/staff/application/availability.use-cases';
import { ProviderProfileUseCases } from '../../modules/staff/application/provider-profile.use-cases';
import { ProviderRepository } from '../../modules/staff/domain/staff.repositories';
import { UserRepository } from '../../modules/identity/domain/user.repository';
import { AppConfig } from '../../config/app-config';

/**
 * Datos de DEMO basados en los prototipos (servicios, prestadoras y horarios).
 * Uso: `npm run seed:demo`. Sólo corre si todavía no hay servicios cargados.
 * Contraseña de las prestadoras demo: DEMO_PASSWORD (por defecto "Demo12345!").
 */
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo12345!';

const weekdays = (ranges: [string, string][], days = [1, 2, 3, 4, 5]): WeeklyAvailabilityRange[] =>
  days.flatMap((day) =>
    ranges.map(([startTime, endTime]) => ({
      dayOfWeek: day as WeeklyAvailabilityRange['dayOfWeek'],
      startTime,
      endTime,
    })),
  );

/** Lunes a viernes 08–13 y 14–20 (almuerzo fijo 13–14), sábados 08–13. */
const STANDARD_WEEK: WeeklyAvailabilityRange[] = [
  ...weekdays([
    ['08:00', '13:00'],
    ['14:00', '20:00'],
  ]),
  ...weekdays([['08:00', '13:00']], [6]),
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    if ((await app.get(ServiceRepository).list({ includeInactive: true })).length > 0) {
      console.log('Ya hay servicios cargados: el seed de demo no se ejecuta.');
      return;
    }
    const categories = app.get(ManageCategoriesUseCase);
    const services = app.get(ManageServicesUseCase);
    const treatments = app.get(ManageTreatmentsUseCase);
    const profiles = app.get(ProviderProfileUseCases);
    const availability = app.get(AvailabilityUseCases);

    // Prestadoras ------------------------------------------------------------
    const admin = await app.get(UserRepository).findByEmail(app.get(AppConfig).initialAdmin.email);
    const melina = admin ? await app.get(ProviderRepository).findByUserId(admin.id) : null;
    const create = (displayName: string, email: string, specialty: string) =>
      profiles.create({
        firstName: displayName.split(' ')[0],
        lastName: displayName.split(' ').slice(1).join(' ') || '-',
        email,
        password: DEMO_PASSWORD,
        displayName,
        specialty,
      });
    const sofia = await create('Sofía Albornoz', 'sofia@demo.local', 'Nutrición Clínica');
    const camila = await create('Camila Vega', 'camila@demo.local', 'Manicuría & Nail Art');
    const valeria = await create('Valeria Ríos', 'valeria@demo.local', 'Masajes');
    await profiles.updateBankDetails(camila.id, {
      alias: 'CAMILA.VEGA.NAILS',
      cbu: '0000003100049281749201',
      holder: 'Camila Belén Vega',
      cuil: '27-38491024-4',
      bankName: 'Banco Galicia / MP',
    });
    const staffIds = [sofia.id, camila.id, valeria.id, ...(melina ? [melina.id] : [])];
    if (melina) {
      await profiles.update(melina.id, {
        displayName: 'Dra. Melina Cannata',
        specialty: 'Medicina Estética',
        isActive: true,
      });
    }
    for (const id of staffIds) await availability.replaceWeekly(id, STANDARD_WEEK);

    // Catálogo -----------------------------------------------------------------
    const cat = async (name: string) => (await categories.create({ name, isActive: true })).id;
    const faciales = await cat('Faciales');
    const unas = await cat('Uñas');
    const masajes = await cat('Masajes');
    const nutricion = await cat('Nutrición');

    const svc = (
      name: string,
      durationMinutes: number,
      price: number,
      categoryIds: string[],
      providerIds: string[],
      recommendationTags: string[],
      prepMinutes = 10,
      cleanupMinutes = 10,
    ) =>
      services.create({
        name,
        durationMinutes,
        price,
        prepMinutes,
        cleanupMinutes,
        isActive: true,
        categoryIds,
        providerIds,
        recommendationTags,
        specificDates: [],
      });

    const melinaIds = melina ? [melina.id] : [];
    const limpieza = await svc('Limpieza Facial Profunda', 60, 25000, [faciales], melinaIds, [
      'limpieza',
      'apariencia',
    ]);
    const peeling = await svc('Peeling Químico', 45, 30000, [faciales], melinaIds, [
      'apariencia',
      'limpieza',
    ]);
    const hidratacion = await svc('Hidratación Facial', 50, 22000, [faciales], melinaIds, [
      'hidratacion',
    ]);
    await svc('Mesoterapia', 45, 35000, [faciales], melinaIds, ['apariencia', 'tonificacion']);
    await svc('Manicuría Rusa + Semipermanente', 90, 22000, [unas], [camila.id], ['apariencia']);
    await svc('Kapping Gel', 75, 18000, [unas], [camila.id], ['apariencia']);
    await svc('Belleza de Pies Spa', 60, 20000, [unas], [camila.id], ['relajacion', 'hidratacion']);
    await svc('Esculpidas en Polygel', 120, 28000, [unas], [camila.id], ['apariencia'], 10, 15);
    await svc(
      'Masaje Descontracturante',
      60,
      24000,
      [masajes],
      [valeria.id],
      ['relajacion'],
      5,
      10,
    );
    await svc(
      'Drenaje Linfático',
      60,
      24000,
      [masajes],
      [valeria.id],
      ['tonificacion', 'relajacion'],
      5,
      10,
    );
    await svc('Control Nutricional', 45, 15000, [nutricion], [sofia.id], ['tonificacion'], 0, 5);

    await treatments.create({
      name: 'Tratamiento Facial Integral',
      description: 'Limpieza, peeling e hidratación en tres sesiones.',
      isActive: true,
      recommendationTags: ['apariencia', 'limpieza', 'hidratacion'],
      serviceIds: [limpieza.id, peeling.id, hidratacion.id],
    });

    console.log('Seed de demo cargado. Prestadoras demo con contraseña:', DEMO_PASSWORD);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
