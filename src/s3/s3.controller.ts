import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { S3Service } from "./s3.service";
import { GetCurrentUser, Permissions } from "src/core/decorator";

import { PermissionType, Upload } from "@blacket/core";
import { S3UploadDto, S3UploadEntity, S3VerifyDto } from "@blacket/types";
import { seconds, Throttle } from "@nestjs/throttler";

@Controller("s3")
export class S3Controller {
    constructor(private readonly s3Service: S3Service) { }

    @Throttle({ default: { limit: 5, ttl: seconds(10) } })
    @Permissions({ permissions: [PermissionType.UPLOAD_FILES_SMALL] })
    @Get("upload/small")
    async uploadFileSmall(
        @GetCurrentUser() userId: string,
        @Query() dto: S3UploadDto
    ): Promise<S3UploadEntity> {
        return await this.s3Service.createPresignedPost(
            userId,
            dto.filename,
            dto.mimetype,
            1024 * 1024 * 10
        );
    }

    @Throttle({ default: { limit: 5, ttl: seconds(10) } })
    @Permissions({ permissions: [PermissionType.UPLOAD_FILES_MEDIUM] })
    @Get("upload/medium")
    async uploadFileMedium(
        @GetCurrentUser() userId: string,
        @Query() dto: S3UploadDto
    ): Promise<S3UploadEntity> {
        return await this.s3Service.createPresignedPost(
            userId,
            dto.filename,
            dto.mimetype,
            1024 * 1024 * 50
        );
    }

    @Throttle({ default: { limit: 5, ttl: seconds(10) } })
    @Permissions({ permissions: [PermissionType.UPLOAD_FILES_LARGE] })
    @Get("upload/large")
    async uploadFileLarge(
        @GetCurrentUser() userId: string,
        @Query() dto: S3UploadDto
    ): Promise<S3UploadEntity> {
        return await this.s3Service.createPresignedPost(
            userId,
            dto.filename,
            dto.mimetype,
            1024 * 1024 * 100
        );
    }

    @Throttle({ default: { limit: 5, ttl: seconds(10) } })
    @Post("verify")
    async verifyFile(
        @GetCurrentUser() userId: string,
        @Body() dto: S3VerifyDto
    ): Promise<Upload> {
        return await this.s3Service.verifyUpload(userId, dto);
    }
}
