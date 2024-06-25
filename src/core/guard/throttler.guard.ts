import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { getClientIp } from "@supercharge/request-ip";
import { Request } from "express";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
    async getTracker(req: Request): Promise<string> {
        const ipAddress = getClientIp(req);

        if (!req.session) return ipAddress;
        else return req.session.userId;
    }

    generateKey(_: ExecutionContext, suffix: string) {
        return suffix;
    }
}
