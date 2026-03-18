export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  WAREHOUSE_ADMIN = 'WAREHOUSE_ADMIN',
  MANAGER = 'MANAGER',
  WORKER = 'WORKER',
  ANALYST = 'ANALYST',
}

export interface LoginDto {
  email: string
  password: string
  tenantSlug: string
}

export interface MobilePinLoginDto {
  email: string
  pin: string
  tenantSlug: string
}

export interface RefreshTokenDto {
  refreshToken: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  role: Role
  expiresIn: number
}

/** Decoded JWT payload */
export interface UserPayload {
  sub: string // userId
  email: string
  role: Role
  tenantId: string
  tenantSlug: string
  iat: number
  exp: number
}
