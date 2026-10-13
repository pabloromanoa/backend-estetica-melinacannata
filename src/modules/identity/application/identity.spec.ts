import { NoopUnitOfWork } from '../../../shared/application/unit-of-work';
import { SequentialIdGenerator } from '../../../shared/domain/id-generator';
import { Role } from '../../../shared/domain/role';
import {
  FakePasswordHasher,
  InMemoryClientRepository,
  InMemoryUserRepository,
} from '../../../../test/support/in-memory-repositories';
import { ClientRegistry } from './client-registry.service';
import { LoginUseCase } from './login.use-case';
import { RegisterClientUseCase } from './register-client.use-case';

function setup() {
  const users = new InMemoryUserRepository();
  const clients = new InMemoryClientRepository();
  const hasher = new FakePasswordHasher();
  const ids = new SequentialIdGenerator('id');
  return {
    users,
    clients,
    register: new RegisterClientUseCase(users, clients, hasher, ids, new NoopUnitOfWork()),
    login: new LoginUseCase(users, hasher),
    registry: new ClientRegistry(clients, ids),
  };
}

const command = {
  firstName: 'Florencia',
  lastName: 'Benítez',
  dni: '38.491.024',
  phone: '1148291102',
  email: 'Flor@Mail.com ',
  password: 'secreta123',
};

describe('Identidad', () => {
  it('registra un cliente con rol CLIENT, email normalizado y contraseña hasheada', async () => {
    const { register, users } = setup();
    const result = await register.execute(command);
    expect(result.user.roles).toEqual([Role.CLIENT]);
    expect(result.user.email).toBe('flor@mail.com');
    expect(result.linkedAppointments).toBe(0);
    const stored = [...users.items.values()][0];
    expect(stored.passwordHash).not.toBe(command.password);
  });

  it('vincula reservas previas de invitado con el mismo DNI', async () => {
    const { register, registry, clients } = setup();
    const guest = await registry.findOrCreateGuest({ ...command, dni: '38491024' });
    clients.appointmentCounts.set(guest.id, 2);
    const result = await register.execute(command);
    expect(result.user.clientId).toBe(guest.id);
    expect(result.linkedAppointments).toBe(2);
    expect(clients.items.get(guest.id)!.userId).toBe(result.user.id);
  });

  it('impide registrar dos veces el mismo email o DNI', async () => {
    const { register } = setup();
    await register.execute(command);
    await expect(register.execute(command)).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
    });
    await expect(register.execute({ ...command, email: 'otro@mail.com' })).rejects.toMatchObject({
      code: 'DNI_ALREADY_REGISTERED',
    });
  });

  it('login con credenciales correctas y mismo error para usuario inexistente o clave errónea', async () => {
    const { register, login } = setup();
    await register.execute(command);
    await expect(login.execute('flor@mail.com', 'secreta123')).resolves.toMatchObject({
      actor: { roles: [Role.CLIENT] },
    });
    await expect(login.execute('flor@mail.com', 'mala')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(login.execute('nadie@mail.com', 'x')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('el registro de invitados reutiliza el cliente por DNI y actualiza su contacto', async () => {
    const { registry } = setup();
    const first = await registry.findOrCreateGuest({ ...command, phone: '111' });
    const second = await registry.findOrCreateGuest({ ...command, dni: '38491024', phone: '222' });
    expect(second.id).toBe(first.id);
    expect(second.phone).toBe('222');
  });
});
