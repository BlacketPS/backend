import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { BlacketLoggerService } from "./logger/logger.service";
import * as path from "path";
import * as fs from "fs";

import { Upload } from "@blacket/core";

@Injectable()
export class CoreService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService,
        private readonly logger: BlacketLoggerService
    ) { }

    safelyParseJSON(json: string): any {
        let parsed: any;

        try {
            parsed = JSON.parse(json);
        } catch (e) {
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
}
