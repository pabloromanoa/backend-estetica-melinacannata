import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { UnitOfWork } from '../../application/unit-of-work';

const storage = new AsyncLocalStorage<EntityManager>();

/**
 * Da a los repositorios el `EntityManager` correcto: el de la transacción en curso
 * (si el caso de uso corre dentro de `UnitOfWork.run`) o el global.
 */
@Injectable()
export class TransactionContext {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  get manager(): EntityManager {
    return storage.getStore() ?? this.dataSource.manager;
  }

  repository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.manager.getRepository(entity);
  }

  get inTransaction(): boolean {
    return storage.getStore() !== undefined;
  }
}

@Injectable()
export class TypeOrmUnitOfWork extends UnitOfWork {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    if (storage.getStore()) return work();
    // READ COMMITTED: después de tomar el lock pesimista, las lecturas ven los turnos que
    // otra transacción acaba de confirmar (con REPEATABLE READ podrían leer una foto vieja).
    return this.dataSource.transaction('READ COMMITTED', (manager) => storage.run(manager, work));
  }
}
