import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { Principal, Role } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets))
      return true;
    const req =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('A bearer token is required.');
    let subject: string;
    try {
      const payload = await this.jwt.verifyAsync(match[1]);
      if (typeof payload.sub !== 'string') throw new Error('Missing subject');
      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: { id: true, role: true, customerId: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    const roles = this.reflector.getAllAndOverride<Role[]>(
      'roles',
      targets,
    ) ?? ['ADMIN'];
    if (!roles.includes(user.role))
      throw new ForbiddenException('Insufficient permissions.');
    req.user = user satisfies Principal;
    return true;
  }
}
