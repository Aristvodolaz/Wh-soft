import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../../shared/decorators/current-user.decorator';

export type JwtRefreshPayload = JwtPayload & { refreshToken: string };

/**
 * JwtRefreshStrategy — validates the long-lived refresh token.
 *
 * Extracts the token from the Authorization: Bearer header and attaches
 * the raw token string to the payload so the service can validate
 * it against the stored hash (rotation check).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    // Extract the raw token so AuthService can compare it against the stored hash
    const authorization = req.headers.authorization ?? '';
    const refreshToken = authorization.replace(/^Bearer\s+/i, '').trim();
    return { ...payload, refreshToken };
  }
}
