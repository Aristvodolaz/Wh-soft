import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AppException } from '../../../../../shared/exceptions/app.exception';
import { Role } from '../../../../../shared/types/role.enum';
import { Tenant, TenantPlan } from '../../../domain/entities/tenant.entity';
import { User } from '../../../domain/entities/user.entity';
import { TenantRepository } from '../../../infrastructure/repositories/tenant.repository';
import { UserRepository } from '../../../infrastructure/repositories/user.repository';
import { AuthService } from '../auth.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const makeTenant = (overrides: Partial<Tenant> = {}): Tenant =>
  Object.assign(new Tenant(), {
    id: 'tenant-uuid',
    slug: 'acme',
    name: 'Acme Warehouses',
    plan: TenantPlan.STARTER,
    isActive: true,
    ...overrides,
  });

const makeUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: 'user-uuid',
    tenantId: 'tenant-uuid',
    email: 'admin@acme.com',
    passwordHash: bcrypt.hashSync('correct-password', 10),
    pinHash: null,
    role: Role.WAREHOUSE_ADMIN,
    isActive: true,
    firstName: 'Jane',
    lastName: 'Doe',
    refreshTokenHash: null,
    ...overrides,
  });

// ── test suite ────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateLastLogin: jest.fn().mockResolvedValue(undefined),
            updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TenantRepository,
          useValue: {
            findBySlug: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              secret: 'test-secret',
              expiresIn: '1h',
              refreshSecret: 'test-refresh-secret',
              refreshExpiresIn: '7d',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    tenantRepository = module.get(TenantRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  // ── validateUser ───────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('returns the User for valid email + password credentials', async () => {
      const tenant = makeTenant();
      const user = makeUser();
      tenantRepository.findBySlug.mockResolvedValueOnce(tenant);
      userRepository.findByEmail.mockResolvedValueOnce(user);

      const result = await service.validateUser('admin@acme.com', 'correct-password', 'acme');

      expect(result).toBe(user);
      expect(tenantRepository.findBySlug).toHaveBeenCalledWith('acme');
      expect(userRepository.findByEmail).toHaveBeenCalledWith('admin@acme.com', tenant.id);
    });

    it('throws 401 when tenant does not exist', async () => {
      tenantRepository.findBySlug.mockResolvedValueOnce(null);

      await expect(service.validateUser('x@x.com', 'pass', 'no-tenant')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 401 when user is not found', async () => {
      tenantRepository.findBySlug.mockResolvedValueOnce(makeTenant());
      userRepository.findByEmail.mockResolvedValueOnce(null);

      await expect(service.validateUser('unknown@acme.com', 'pass', 'acme')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 401 when user has no passwordHash (PIN-only account)', async () => {
      tenantRepository.findBySlug.mockResolvedValueOnce(makeTenant());
      userRepository.findByEmail.mockResolvedValueOnce(makeUser({ passwordHash: null }));

      await expect(service.validateUser('admin@acme.com', 'pass', 'acme')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 401 for wrong password', async () => {
      tenantRepository.findBySlug.mockResolvedValueOnce(makeTenant());
      userRepository.findByEmail.mockResolvedValueOnce(makeUser());

      await expect(
        service.validateUser('admin@acme.com', 'wrong-password', 'acme'),
      ).rejects.toThrow(AppException);
    });
  });

  // ── validatePin ────────────────────────────────────────────────────────────

  describe('validatePin', () => {
    it('returns the User for a valid PIN (WORKER role)', async () => {
      const tenant = makeTenant();
      const worker = makeUser({
        role: Role.WORKER,
        pinHash: bcrypt.hashSync('1234', 10),
        passwordHash: null,
      });
      tenantRepository.findBySlug.mockResolvedValueOnce(tenant);
      userRepository.findByEmail.mockResolvedValueOnce(worker);

      const result = await service.validatePin('worker@acme.com', '1234', 'acme');

      expect(result).toBe(worker);
    });

    it('throws 403 for non-WORKER role', async () => {
      const tenant = makeTenant();
      const manager = makeUser({ role: Role.MANAGER, pinHash: bcrypt.hashSync('1234', 10) });
      tenantRepository.findBySlug.mockResolvedValueOnce(tenant);
      userRepository.findByEmail.mockResolvedValueOnce(manager);

      await expect(service.validatePin('manager@acme.com', '1234', 'acme')).rejects.toThrow(
        AppException,
      );
    });

    it('throws 401 for wrong PIN', async () => {
      const tenant = makeTenant();
      const worker = makeUser({ role: Role.WORKER, pinHash: bcrypt.hashSync('1234', 10) });
      tenantRepository.findBySlug.mockResolvedValueOnce(tenant);
      userRepository.findByEmail.mockResolvedValueOnce(worker);

      await expect(service.validatePin('worker@acme.com', '9999', 'acme')).rejects.toThrow(
        AppException,
      );
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('issues tokens and persists refresh hash', async () => {
      const user = makeUser();
      jwtService.signAsync.mockResolvedValue('signed-token');
      configService.get.mockReturnValue({
        secret: 's',
        expiresIn: '1h',
        refreshSecret: 'rs',
        refreshExpiresIn: '7d',
      });

      const result = await service.login(user);

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.role).toBe(Role.WAREHOUSE_ADMIN);
      expect(result.expiresIn).toBe(3600);
      expect(userRepository.updateRefreshTokenHash).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
      );
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(user.id);
    });
  });

  // ── hashPassword / hashPin ─────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('returns a bcrypt hash that verifies against the plain text', async () => {
      const hash = await service.hashPassword('my-secret');
      const valid = await bcrypt.compare('my-secret', hash);
      expect(valid).toBe(true);
    });
  });

  describe('hashPin', () => {
    it('returns a bcrypt hash that verifies against the plain PIN', async () => {
      const hash = await service.hashPin('5678');
      const valid = await bcrypt.compare('5678', hash);
      expect(valid).toBe(true);
    });
  });
});
