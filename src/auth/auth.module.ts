import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || Buffer.byteLength(secret) < 32)
          throw new Error('JWT_SECRET must contain at least 32 bytes.');
        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: '15m',
            issuer: 'store-api',
            audience: 'store-clients',
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'store-api',
            audience: 'store-clients',
          },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    AuthResolver,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
