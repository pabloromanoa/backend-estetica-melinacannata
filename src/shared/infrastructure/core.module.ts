import { Global, Module } from '@nestjs/common';
import { UnitOfWork } from '../application/unit-of-work';
import { Clock, SystemClock } from '../domain/clock';
import { IdGenerator, UuidGenerator } from '../domain/id-generator';
import { BusinessTime } from '../domain/business-time';
import { BookingPolicy } from '../domain/booking-policy';
import { AppConfig } from '../../config/app-config';
import { TransactionContext, TypeOrmUnitOfWork } from './persistence/transaction-context';

/** Proveedores transversales: transacciones, reloj, ids, zona horaria y política de reservas. */
@Global()
@Module({
  providers: [
    TransactionContext,
    { provide: UnitOfWork, useClass: TypeOrmUnitOfWork },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    {
      provide: BusinessTime,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new BusinessTime(config.businessTimezone),
    },
    {
      provide: BookingPolicy,
      inject: [AppConfig],
      useFactory: ({ bookingRules: r }: AppConfig) =>
        new BookingPolicy(
          r.depositPercentage,
          r.holdMinutes,
          r.staffHoldMinutes,
          r.cancellationRefundHours,
          r.reminderHoursBefore,
        ),
    },
  ],
  exports: [TransactionContext, UnitOfWork, Clock, IdGenerator, BusinessTime, BookingPolicy],
})
export class CoreModule {}
