import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../../shared/types/role.enum';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  /** Look up an active user by email within a specific tenant. */
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email: email.toLowerCase(), tenantId, isActive: true },
    });
  }

  /** Tenant-scoped lookup by primary key. */
  async findById(id: string, tenantId: string): Promise<User | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  /** All active users for a given tenant. */
  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.repo.find({ where: { tenantId, isActive: true } });
  }

  /** Active users filtered by role for a tenant. */
  async findByRole(tenantId: string, role: Role): Promise<User[]> {
    return this.repo.find({ where: { tenantId, role, isActive: true } });
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  /** Stamp last_login_at without loading the full entity. */
  async updateLastLogin(userId: string): Promise<void> {
    await this.repo.update({ id: userId }, { lastLoginAt: new Date() });
  }

  /**
   * Store or clear the hashed refresh token.
   * Pass null to invalidate all sessions (logout / revoke).
   */
  async updateRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.repo.update({ id: userId }, { refreshTokenHash: hash });
  }

  async existsByEmail(email: string, tenantId: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { email: email.toLowerCase(), tenantId },
    });
    return count > 0;
  }
}
