import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';
import { User } from '../../domain/entities/user.entity';
import { MobilePinLoginDto } from '../dto/mobile-pin-login.dto';
import { AuthService } from '../services/auth.service';

/**
 * MobilePinStrategy — numeric PIN authentication for warehouse workers.
 *
 * Reuses passport-local internally but targets the `pin` field instead of
 * `password`. Only users with WORKER role and a configured pinHash can
 * authenticate through this strategy.
 */
@Injectable()
export class MobilePinStrategy extends PassportStrategy(Strategy, 'mobile-pin') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'pin',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, pin: string): Promise<User> {
    const { tenantSlug } = req.body as MobilePinLoginDto;
    return this.authService.validatePin(email, pin, tenantSlug);
  }
}
