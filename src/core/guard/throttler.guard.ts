import { Injectable } from "@nestjs/common";
import { ThrottlerException, ThrottlerGuard } from "@nestjs/throttler";
import { ThrottlerLimitDetail } from "@nestjs/throttler/dist/throttler.guard.interface";
import { getClientIp } from "@supercharge/request-ip";
import { Request } from "express";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
    async getTracker(req: Request): Promise<string> {
        const ipAddress = getClientIp(req);

        if (!req.session) return ipAddress;
        else return req.session.userId;
    }

    async throwThrottlingException(_, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
        throw new ThrottlerException(`You are being rate limited. Please wait ${throttlerLimitDetail.ttl}ms before trying again.`);
    }
}
