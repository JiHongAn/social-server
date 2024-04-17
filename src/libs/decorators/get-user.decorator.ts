import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data, ctx: ExecutionContext): { id: string } => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
