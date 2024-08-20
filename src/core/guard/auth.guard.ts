import { Reflector } from "@nestjs/core";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { CoreService } from "src/core/core.service";
import { RedisService } from "src/redis/redis.service";
import { Request } from "express";
import { getClientIp } from "@supercharge/request-ip";
import { IS_PUBLIC_KEY } from "../decorator";

export interface Session {
    id: string;
    userId: string;
    createdAt: Date;
}

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly coreService: CoreService,
        private readonly redisService: RedisService,
        private reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext) {
        const request: Request = context.switchToHttp().getRequest();

        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (isPublic) {
            // TODO: implement this when blacklists table is done
            // const blacklist = await this.redisService.getBlacklist(getClientIp(request));
            // if (blacklist) throw new ForbiddenException(blacklist.punishment.reason);

            return true;
        }

        const token = this.extractTokenFromHeader(request);

        if (!token) throw new UnauthorizedException();

        const decodedToken = this.coreService.safelyParseJSON(Buffer.from(token, "base64").toString());
        if (!decodedToken) throw new UnauthorizedException();

        const session = await this.redisService.getSession(decodedToken.userId);
        if (!session) throw new UnauthorizedException();

        if (decodedToken.id !== session.id) throw new UnauthorizedException();

        request.session = session;

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        return request.headers.authorization ?? undefined;
    }
}
