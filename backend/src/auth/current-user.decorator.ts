import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type JwtPayload = {
  sub: number;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
