import { Module } from '@nestjs/common';
import { IdentityModule } from '../../modules/identity/identity.module';
import { StaffModule } from '../../modules/staff/staff.module';
import { InitialAdminSeeder } from './initial-admin.seeder';

@Module({
  imports: [IdentityModule, StaffModule],
  providers: [InitialAdminSeeder],
})
export class SeedsModule {}
