import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuidv4 } from "uuid";
import { Upload } from "@blacket/core";
import { S3UploadEntity, S3VerifyDto } from "@blacket/types";

@Injectable()
export class S3Service {
    constructor(
        private configService: ConfigService,
        private prismaService: PrismaService
    ) { }

    private readonly S3 = new S3Client({
        region: this.configService.get("SERVER_S3_REGION"),
        credentials: {
            accessKeyId: this.configService.get("SERVER_S3_ACCESS_KEY"),
            secretAccessKey: this.configService.get("SERVER_S3_SECRET_KEY")
        }
    });

    async createPresignedPost(
        userId: string,
        filename: string,
        contentType: string,
        maxSizeBytes: number
    ): Promise<S3UploadEntity> {
        const uploadId = uuidv4();

        const key = `users/${userId}/${uploadId}/${filename}`;

        return await createPresignedPost(this.S3, {
            Bucket: this.configService.get("SERVER_S3_BUCKET"),
            Key: key,
            Conditions: [
                ["content-length-range", 1, maxSizeBytes],
                { "Content-Type": contentType }
            ],
            Fields: {
                key,
                "Content-Type": contentType
            },
            Expires: 300
        });
    }

    async verifyUpload(
        userId: string,
        dto: S3VerifyDto
    ): Promise<Upload> {
        const upload = await this.prismaService.upload.findFirst({
            where: {
                userId,
                uploadId: dto.uploadId
            }
        });
        if (upload) throw new ConflictException("Upload already exists");

        const prefix = `users/${userId}/${dto.uploadId}/`;

        const { Contents } = await this.S3.send(new ListObjectsV2Command({
            Bucket: this.configService.get("SERVER_S3_BUCKET"),
            Prefix: prefix,
            MaxKeys: 1
        }));
        if (!Contents || Contents.length === 0) throw new NotFoundException("File not found");

        const filename = Contents[0].Key.split("/").pop();
        if (!filename) throw new NotFoundException("File not found");

        return await this.prismaService.upload.create({
            data: {
                userId,
                uploadId: dto.uploadId,
                filename
            }
        });
    }
}
