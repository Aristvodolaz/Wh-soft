import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../../shared/decorators/current-user.decorator';

/**
 * JwtStrategy — validates the short-lived access token.
 *
 * Extracts the JWT from the Authorization: Bearer <token> header.
 * The validated payload is attached to request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  /** Return the payload as-is — it becomes request.user. */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
