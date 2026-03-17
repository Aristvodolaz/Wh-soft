import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Public } from '../../../../shared/decorators/public.decorator';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dto/login.dto';
import { MobilePinLoginDto } from '../../application/dto/mobile-pin-login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { TokenResponseDto } from '../../application/dto/token-response.dto';
import { JwtRefreshPayload } from '../../application/strategies/jwt-refresh.strategy';
import { User } from '../../domain/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
@Public() // All auth endpoints are public — no JWT required to reach them
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Email + password login. Returns access + refresh token pair.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // Stricter rate limit on login
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: TokenResponseDto, description: 'JWT token pair' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive account' })
  async login(@CurrentUser() user: User): Promise<TokenResponseDto> {
    return this.authService.login(user);
  }

  /**
   * POST /auth/refresh
   * Rotate tokens. Send the refresh token as Authorization: Bearer <token>.
   * The old refresh token is immediately invalidated (token rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: TokenResponseDto, description: 'New JWT token pair' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid, expired, or reused' })
  async refresh(@CurrentUser() user: JwtRefreshPayload): Promise<TokenResponseDto> {
    return this.authService.refresh(user.refreshToken);
  }

  /**
   * POST /auth/mobile-pin
   * Numeric PIN authentication for WORKER role on mobile scanners.
   */
  @Post('mobile-pin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('mobile-pin'))
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // Stricter rate limit
  @ApiOperation({ summary: 'Login with mobile PIN (WORKER role only)' })
  @ApiBody({ type: MobilePinLoginDto })
  @ApiOkResponse({ type: TokenResponseDto, description: 'JWT token pair' })
  @ApiUnauthorizedResponse({ description: 'Invalid PIN or not a WORKER account' })
  async mobilePin(@CurrentUser() user: User): Promise<TokenResponseDto> {
    return this.authService.login(user);
  }
}
