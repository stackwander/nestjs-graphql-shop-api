import {
  Catch,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements GqlExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ConflictException(
          'A record with these unique fields already exists.',
        );
      case 'P2003':
        return new ConflictException(
          'This change conflicts with related records.',
        );
      case 'P2025':
        return new NotFoundException('Record not found.');
      case 'P2034':
        return new ConflictException(
          'Concurrent change detected. Please retry.',
        );
      case 'P2000':
      case 'P2004':
      case 'P2006':
      case 'P2011':
        return new BadRequestException(
          'The database could not apply this change.',
        );
      case 'P2024':
      case 'P2028':
        return new ServiceUnavailableException(
          'Database temporarily unavailable.',
        );
      default:
        return new InternalServerErrorException('Database operation failed.');
    }
  }
}
