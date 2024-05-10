import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const GetCurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): string => {
    return context.switchToHttp().getRequest().session.userId;
});
