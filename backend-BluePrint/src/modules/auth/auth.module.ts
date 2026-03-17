import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tenant } from './domain/entities/tenant.entity';
import { User } from './domain/entities/user.entity';

import { TenantRepository } from './infrastructure/repositories/tenant.repository';
import { UserRepository } from './infrastructure/repositories/user.repository';

import { AuthService } from './application/services/auth.service';
import { JwtRefreshStrategy } from './application/strategies/jwt-refresh.strategy';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { LocalStrategy } from './application/strategies/local.strategy';
import { MobilePinStrategy } from './application/strategies/mobile-pin.strategy';

import { AuthController } from './interface/controllers/auth.controller';

@Module({
  imports: [
    // Register TypeORM repositories for this module
    TypeOrmModule.forFeature([User, Tenant]),

    // Default strategy used by the global JwtAuthGuard
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule configured from environment — secret validated by Joi at startup
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn', '1h'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Application layer
    AuthService,

    // Infrastructure layer
    UserRepository,
    TenantRepository,

    // Passport strategies
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    MobilePinStrategy,
  ],
  exports: [
    // Expose for other modules that need JWT verification or user lookups
    AuthService,
    UserRepository,
    TenantRepository,
    JwtModule,
  ],
})
export class AuthModule {}
