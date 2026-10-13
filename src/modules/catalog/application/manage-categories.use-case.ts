import { Injectable } from '@nestjs/common';
import { InvalidInputError, NotFoundError } from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { Category } from '../domain/catalog';
import { CategoryRepository } from '../domain/catalog.repositories';

export interface CategoryCommand {
  name: string;
  isActive: boolean;
}

/**
 * Categorías del catálogo. Desactivar conserva las asociaciones; eliminar borra la categoría
 * y sus asociaciones, pero NUNCA los servicios.
 */
@Injectable()
export class ManageCategoriesUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  list(includeInactive: boolean): Promise<Category[]> {
    return this.categories.list({ includeInactive });
  }

  async create(command: CategoryCommand): Promise<Category> {
    const category: Category = { id: this.ids.next(), ...this.normalize(command) };
    await this.categories.save(category);
    return category;
  }

  async update(id: string, command: CategoryCommand): Promise<Category> {
    if (!(await this.categories.findById(id))) throw new NotFoundError('Categoría', id);
    const category: Category = { id, ...this.normalize(command) };
    await this.categories.save(category);
    return category;
  }

  async delete(id: string): Promise<void> {
    if (!(await this.categories.findById(id))) throw new NotFoundError('Categoría', id);
    await this.categories.delete(id);
  }

  private normalize(command: CategoryCommand): Omit<Category, 'id'> {
    const name = command.name.trim();
    if (!name) throw new InvalidInputError('El nombre es obligatorio');
    return { name, isActive: command.isActive };
  }
}
