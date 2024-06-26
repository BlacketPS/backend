import { getClientIp } from "@supercharge/request-ip";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const RealIp = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return getClientIp(request);
});
