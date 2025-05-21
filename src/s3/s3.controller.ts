import { Controller, Get, UseInterceptors, UsePipes, Query, Post, Body } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { S3Service } from "./s3.service";
import { GetCurrentUser, Permissions } from "src/core/decorator";
import { FileSizeValidationPipe } from "src/core/pipe";

import { PermissionType, Upload } from "@blacket/core";
import { S3UploadDto, S3UploadEntity, S3VerifyDto } from "@blacket/types";

@Controller("s3")
export class S3Controller {
    constructor(private readonly s3Service: S3Service) { }

    @UseInterceptors(FileInterceptor("file"))
    @UsePipes(new FileSizeValidationPipe(1024 * 1024 * 10))
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

    @UseInterceptors(FileInterceptor("file"))
    @UsePipes(new FileSizeValidationPipe(1024 * 1024 * 50))
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

    @UseInterceptors(FileInterceptor("file"))
    @UsePipes(new FileSizeValidationPipe(1024 * 1024 * 100))
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

    @Post("verify")
    async verifyFile(
        @GetCurrentUser() userId: string,
        @Body() dto: S3VerifyDto
    ): Promise<Upload> {
        return await this.s3Service.verifyUpload(userId, dto);
    }
}
