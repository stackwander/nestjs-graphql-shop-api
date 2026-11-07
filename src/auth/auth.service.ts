import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { LoginInput, RegisterInput } from './auth.inputs';
import { hashPassword, verifyPassword } from './password';

@Injectable()
export class AuthService {
  // A dummy hash keeps the expensive password check on the unknown-user path too.
  private readonly dummyHash = hashPassword('unused-dummy-password');
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const { password, ...profile } = input;
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email: profile.cemail,
        passwordHash,
        role: 'CUSTOMER',
        customer: { create: profile },
      },
    });
    return { accessToken: await this.jwt.signAsync({ sub: user.id }) };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid)
      throw new UnauthorizedException('Invalid email or password.');
    return { accessToken: await this.jwt.signAsync({ sub: user.id }) };
  }
}
