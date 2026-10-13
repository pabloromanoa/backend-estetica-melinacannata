import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfig } from './config/app-config';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { SeedsModule } from './database/seeds/seeds.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthController } from './modules/health/health.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { StaffModule } from './modules/staff/staff.module';
import { CoreModule } from './shared/infrastructure/core.module';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';
import { ResponseEnvelopeInterceptor } from './shared/infrastructure/http/response-envelope.interceptor';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CoreModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        { ttl: config.throttle.ttlMs, limit: config.throttle.limit },
      ],
    }),
    IdentityModule,
    CatalogModule,
    StaffModule,
    RecommendationsModule,
    SchedulingModule,
    ReportingModule,
    SeedsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
