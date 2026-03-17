import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { Role } from '../../../../shared/types/role.enum';
import { User } from '../../domain/entities/user.entity';
import { TenantRepository } from '../../infrastructure/repositories/tenant.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { TokenResponseDto } from '../dto/token-response.dto';

/** Convert a JWT expiresIn string ('1h', '15m', '7d') to seconds. */
function parseTtlToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 3600;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 3600;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate email + password credentials.
   * Called by LocalStrategy — throws AppException (→ 401) on failure.
   */
  async validateUser(email: string, password: string, tenantSlug: string): Promise<User> {
    const tenant = await this.tenantRepository.findBySlug(tenantSlug);
    if (!tenant) {
      this.logger.warn(`Login attempt for unknown tenant: ${tenantSlug}`);
      throw AppException.unauthorized('Invalid credentials');
    }

    const user = await this.userRepository.findByEmail(email, tenant.id);
    if (!user) {
      this.logger.warn(`Login attempt for unknown email: ${email} in tenant ${tenantSlug}`);
      throw AppException.unauthorized('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw AppException.unauthorized('Password login is not available for this account');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      this.logger.warn(`Failed password login for ${email} in tenant ${tenantSlug}`);
      throw AppException.unauthorized('Invalid credentials');
    }

    return user;
  }

  /**
   * Validate mobile PIN credentials.
   * Only available to WORKER role accounts.
   * Called by MobilePinStrategy.
   */
  async validatePin(email: string, pin: string, tenantSlug: string): Promise<User> {
    const tenant = await this.tenantRepository.findBySlug(tenantSlug);
    if (!tenant) {
      throw AppException.unauthorized('Invalid credentials');
    }

    const user = await this.userRepository.findByEmail(email, tenant.id);
    if (!user) {
      throw AppException.unauthorized('Invalid credentials');
    }

    if (user.role !== Role.WORKER) {
      throw AppException.forbidden('PIN authentication is only available for warehouse workers');
    }

    if (!user.pinHash) {
      throw AppException.unauthorized('PIN login is not configured for this account');
    }

    const pinValid = await bcrypt.compare(pin, user.pinHash);
    if (!pinValid) {
      this.logger.warn(`Failed PIN login for ${email} in tenant ${tenantSlug}`);
      throw AppException.unauthorized('Invalid credentials');
    }

    return user;
  }

  /**
   * Issue access + refresh tokens and persist the hashed refresh token.
   * Called after Passport strategy validates the user.
   */
  async login(user: User): Promise<TokenResponseDto> {
    const tokens = await this.generateTokenPair(user);

    // Persist refresh token hash for rotation validation
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.updateRefreshTokenHash(user.id, refreshHash);
    await this.userRepository.updateLastLogin(user.id);

    this.logger.log(`User ${user.id} logged in (role: ${user.role})`);
    return tokens;
  }

  /**
   * Rotate tokens: validate the incoming refresh token, issue a new pair.
   * Detects refresh-token reuse (hash mismatch → revoke & throw 401).
   */
  async refresh(incomingRefreshToken: string): Promise<TokenResponseDto> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(incomingRefreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw AppException.unauthorized('Refresh token is invalid or has expired');
    }

    const user = await this.userRepository.findById(payload.sub, payload.tenantId);
    if (!user || !user.isActive) {
      throw AppException.unauthorized('Session is no longer valid');
    }

    if (!user.refreshTokenHash) {
      // Token already revoked (e.g. logout)
      throw AppException.unauthorized('Session has been terminated');
    }

    const hashMatch = await bcrypt.compare(incomingRefreshToken, user.refreshTokenHash);
    if (!hashMatch) {
      // Reuse detected — invalidate all sessions
      this.logger.warn(`Refresh token reuse detected for user ${user.id}. Revoking all sessions.`);
      await this.userRepository.updateRefreshTokenHash(user.id, null);
      throw AppException.unauthorized('Refresh token reuse detected. Please log in again.');
    }

    const tokens = await this.generateTokenPair(user);
    const newHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.updateRefreshTokenHash(user.id, newHash);

    return tokens;
  }

  /** Hash a plain-text password at bcrypt cost factor 12. */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /** Hash a numeric PIN at bcrypt cost factor 10. */
  async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
  }

  // ── private ──────────────────────────────────────────────────────────────

  private async generateTokenPair(user: User): Promise<TokenResponseDto> {
    const jwtConfig = this.configService.get<{
      secret: string;
      expiresIn: string;
      refreshSecret: string;
      refreshExpiresIn: string;
    }>('jwt')!;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      tenantId: user.tenantId,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtConfig.secret,
        expiresIn: jwtConfig.expiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtConfig.refreshSecret,
        expiresIn: jwtConfig.refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      role: user.role,
      expiresIn: parseTtlToSeconds(jwtConfig.expiresIn),
    };
  }
}
