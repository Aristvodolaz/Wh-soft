import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AppException } from '../../../../../shared/exceptions/app.exception';
import { Role } from '../../../../../shared/types/role.enum';
import { User } from '../../../domain/entities/user.entity';
import { AuthService } from '../../services/auth.service';
import { LocalStrategy } from '../local.strategy';

const makeUser = (): User =>
  Object.assign(new User(), {
    id: 'user-uuid',
    tenantId: 'tenant-uuid',
    email: 'admin@acme.com',
    role: Role.WAREHOUSE_ADMIN,
    isActive: true,
  });

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<Pick<AuthService, 'validateUser'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: { validateUser: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  it('returns a User when credentials are valid', async () => {
    const user = makeUser();
    (authService.validateUser as jest.Mock).mockResolvedValueOnce(user);
    const req = { body: { tenantSlug: 'acme' } } as Request;

    const result = await strategy.validate(req, 'admin@acme.com', 'correct-pass');

    expect(authService.validateUser).toHaveBeenCalledWith('admin@acme.com', 'correct-pass', 'acme');
    expect(result).toBe(user);
  });

  it('propagates AppException when authService throws', async () => {
    (authService.validateUser as jest.Mock).mockRejectedValueOnce(
      AppException.unauthorized('Invalid credentials'),
    );
    const req = { body: { tenantSlug: 'acme' } } as Request;

    await expect(strategy.validate(req, 'bad@acme.com', 'wrong')).rejects.toThrow(AppException);
  });
});
