import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<string>() === 'graphql') {
      const { req, res } = GqlExecutionContext.create(context).getContext();
      return { req, res: res ?? req.res };
    }
    return super.getRequestResponse(context);
  }
}
