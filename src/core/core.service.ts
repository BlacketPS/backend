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

    async userUploadFile(userId: string, file: Partial<Express.Multer.File>) {
        const uploadPath = `/user/${userId}`;
        const rawUploadPath = `${this.configService.get("SERVER_UPLOAD_PATH")}${uploadPath}`;

        // using basename so no path traversal
        const fileName = path.basename(file.originalname.slice(0, file.originalname.lastIndexOf(".")));
        const fileType = path.basename(file.originalname.slice(file.originalname.lastIndexOf(".")));

        const constructedFileName = `${fileName}_${Date.now()}${fileType}`;

        if (!fs.existsSync(rawUploadPath)) fs.mkdirSync(rawUploadPath, { recursive: true });
        fs.writeFileSync(`${rawUploadPath}/${constructedFileName}`, file.buffer);

        return await this.prismaService.upload.create({
            data: {
                userId,
                path: `${uploadPath}/${constructedFileName}`
            }
        });
    }

    async getUploadPath(upload: Upload): Promise<string> {
        return `${this.configService.get("SERVER_UPLOAD_PATH")}${upload.path}`;
    }
}
