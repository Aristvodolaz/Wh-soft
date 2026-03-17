import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';
import { Role } from '../../../../shared/types/role.enum';
import { Tenant } from './tenant.entity';

/**
 * User entity — extends BaseEntity for id + tenantId + timestamps.
 * Supports two auth methods: email+password and PIN (mobile workers).
 */
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  email: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, default: null })
  passwordHash: string | null;

  @Column({ name: 'pin_hash', type: 'varchar', length: 255, nullable: true, default: null })
  pinHash: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'user_role_enum',
    default: Role.WORKER,
  })
  role: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true, default: null })
  lastLoginAt: Date | null;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  refreshTokenHash: string | null;

  // Eager load not needed — only join when explicitly required
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  /** Computed helper: full display name */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
