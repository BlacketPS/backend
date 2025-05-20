import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

@Injectable()
export class S3Service {
    constructor(private configService: ConfigService) { }

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
    ): Promise<{ url: string; fields: Record<string, string> }> {
        const uploadId = ((new Date().getTime()).toString(36)).toUpperCase();

        const key = `users/${userId}/${uploadId}/${filename}`;

        return await createPresignedPost(this.S3, {
            Bucket: process.env.S3_BUCKET!,
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
}
