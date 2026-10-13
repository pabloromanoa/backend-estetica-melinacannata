import { CreateDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Columnas comunes a todas las tablas: UUID generado en el dominio + auditoría. */
export abstract class BaseOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt: Date;
}

/** Transformer para columnas DECIMAL: MySQL las devuelve como string. */
export const decimalTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
