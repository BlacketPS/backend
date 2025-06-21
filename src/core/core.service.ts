import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BlacketLoggerService } from "./logger/logger.service";
import axios from "axios";

import { Upload } from "@blacket/core";

@Injectable()
export class CoreService {
    constructor(
        private readonly configService: ConfigService,
        private readonly logger: BlacketLoggerService
    ) { }

    safelyParseJSON(json: string): any {
        let parsed: any;

        try {
            parsed = JSON.parse(json);
        } catch (e) {
            // this should really only be in dev
            this.logger.error("Failed to parse JSON", e);
        }

        return parsed;
    }

    serializeBigInt(obj: any): any {
        if (typeof obj === "bigint") return obj.toString();
        else if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
        else if (typeof obj === "object" && obj !== null) return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, this.serializeBigInt(value)]));

        return obj;
    }

    async getUserUploadPath(upload: Upload): Promise<string> {
        return `${this.configService.get("VITE_CDN_URL")}/users/${upload.userId}/${upload.uploadId}/${upload.filename}`;
    }

    async verifyTurnstile(token: string, ip?: string): Promise<boolean> {
        const secret = this.configService.get("SERVER_TURNSTILE_SECRET_KEY");

        const body = new URLSearchParams();

        body.append("secret", secret);
        body.append("response", token);
        if (ip) body.append("remoteip", ip);

        const res = await axios.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            body.toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        return res.data.success === true;
    }
}
