import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../shared/infrastructure/auth/auth.decorators';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up' | 'down' }> {
    const database = await this.dataSource
      .query('SELECT 1')
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
    return { status: 'ok', database };
  }
}
