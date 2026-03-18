import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';
import { User } from '../../domain/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';

/**
 * LocalStrategy — email + password authentication.
 *
 * Uses passReqToCallback to read tenantSlug from the request body,
 * since Passport's default LocalStrategy only forwards email + password.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<User> {
    const { tenantSlug } = req.body as LoginDto;
    return this.authService.validateUser(email, password, tenantSlug);
  }
}
