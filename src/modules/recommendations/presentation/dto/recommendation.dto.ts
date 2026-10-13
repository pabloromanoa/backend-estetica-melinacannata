import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject } from 'class-validator';

export class CreateRecommendationDto {
  @ApiProperty({
    example: { objective: 'relajacion', time: '60', scope: 'puntual' },
    description: 'Respuestas del cuestionario (questionId → value)',
  })
  @IsObject()
  answers: Record<string, string>;
}

export class RecommendationOutcomeDto {
  @ApiProperty({ enum: ['ACCEPTED', 'DISCARDED'] })
  @IsIn(['ACCEPTED', 'DISCARDED'])
  outcome: 'ACCEPTED' | 'DISCARDED';
}
