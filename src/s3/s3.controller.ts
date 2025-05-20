import { Controller, Get, UseInterceptors, UsePipes, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { S3Service } from "./s3.service";
import { GetCurrentUser, Permissions } from "src/core/decorator";
import { FileSizeValidationPipe } from "src/core/pipe";

import { PermissionType } from "@blacket/core";

@Controller("s3")
export class S3Controller {
    constructor(private readonly s3Service: S3Service) { }

    @UseInterceptors(FileInterceptor("file"))
    @UsePipes(new FileSizeValidationPipe(1024 * 1024 * 10))
    @Permissions({ permissions: [PermissionType.UPLOAD_FILES_SMALL] })
    @Get("upload/small")
    async uploadFileSmall(@GetCurrentUser() userId: string, @UploadedFile() file: Express.Multer.File) {
        return await this.s3Service.createPresignedPost(
            userId,
            file.originalname,
            file.mimetype,
            1024 * 1024 * 10
        );
    }

    @UseInterceptors(FileInterceptor("file"))
    @UsePipes(new FileSizeValidationPipe(1024 * 1024 * 50))
    @Permissions({ permissions: [PermissionType.UPLOAD_FILES_MEDIUM] })
    @Get("upload/medium")
    async uploadFileMedium(@GetCurrentUser() userId: string, @UploadedFile() file: Express.Multer.File) {
        return await this.s3Service.createPresignedPost(
            userId,
            file.originalname,
            file.mimetype,
            1024 * 1024 * 50
        );
    }

    @UseInterceptors(FileInterceptor("file"))
    @UsePipes(new FileSizeValidationPipe(1024 * 1024 * 100))
    @Permissions({ permissions: [PermissionType.UPLOAD_FILES_LARGE] })
    @Get("upload/large")
    async uploadFileLarge(@GetCurrentUser() userId: string, @UploadedFile() file: Express.Multer.File) {
        return await this.s3Service.createPresignedPost(
            userId,
            file.originalname,
            file.mimetype,
            1024 * 1024 * 100
        );
    }
}
