import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CoreService } from "src/core/core.service";
import { CosmeticsChangeBannerDto, CosmeticsChangeColorTier1Dto, CosmeticsChangeColorTier2Dto, CosmeticsChangeFontDto, CosmeticsChangeTitleDto, NotFound, Forbidden, CosmeticsChangeAvatarDto, CosmeticsUploadAvatarDto } from "@blacket/types";
import { blookifyImage } from "@blacket/common";
import * as fs from "fs";
import { Readable } from "stream";

@Injectable()
export class CosmeticsService {
    constructor(
        private redisService: RedisService,
        private prismaService: PrismaService,
        private coreService: CoreService
    ) { }

    async changeAvatar(userId: string, dto: CosmeticsChangeAvatarDto) {
        const blook = await this.redisService.getBlook(dto.blookId);
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        const userBlookCount = await this.prismaService.userBlook.count({ where: { userId, blookId: dto.blookId, sold: false } });
        if (dto.blookId !== 1 && userBlookCount < 1) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

        await this.prismaService.user.update({
            data: {
                avatar: { connect: { id: blook.imageId } },
                customAvatar: { disconnect: true }
            },
            where: { id: userId }
        });
    }

    async changeBanner(userId: string, dto: CosmeticsChangeBannerDto) {
        const banner = await this.redisService.getBanner(dto.bannerId);
        if (!banner) throw new NotFoundException(NotFound.UNKNOWN_BANNER);

        await this.prismaService.user.update({
            data: { banner: { connect: { id: banner.imageId } } },
            where: { id: userId }
        });
    }

    async changeTitle(userId: string, dto: CosmeticsChangeTitleDto) {
        const title = await this.redisService.getTitle(dto.titleId);
        if (!title) throw new NotFoundException(NotFound.UNKNOWN_TITLE);

        const userTitleCount = await this.prismaService.userTitle.count({ where: { userId, titleId: dto.titleId } });
        if (dto.titleId !== 1 && userTitleCount < 1) throw new ForbiddenException(Forbidden.COSMETICS_TITLES_NOT_OWNED);

        await this.prismaService.user.update({
            data: { title: { connect: { id: title.id } } },
            where: { id: userId }
        });
    }

    async changeColorTier1(userId: string, dto: CosmeticsChangeColorTier1Dto) {
        await this.prismaService.user.update({ data: { color: dto.color }, where: { id: userId } });
    }

    async changeColorTier2(userId: string, dto: CosmeticsChangeColorTier2Dto) {
        await this.prismaService.user.update({ data: { color: dto.color }, where: { id: userId } });
    }

    async changeFont(userId: string, dto: CosmeticsChangeFontDto) {
        const font = await this.redisService.getFont(dto.fontId);
        if (!font) throw new NotFoundException(NotFound.UNKNOWN_FONT);

        const userFontCount = await this.prismaService.userFont.count({ where: { userId, fontId: dto.fontId } });
        if (!font.default && userFontCount < 1) throw new ForbiddenException(Forbidden.COSMETICS_FONTS_NOT_OWNED);

        await this.prismaService.user.update({ data: { font: { connect: { id: font.id } } }, where: { id: userId } });
    }

    async uploadAvatar(userId: string, dto: CosmeticsUploadAvatarDto) {
        const upload = await this.prismaService.upload.findUnique({
            where: {
                id: dto.uploadId,
                userId
            },
            include: {

            }
        });
        if (!upload) throw new NotFoundException(NotFound.UNKNOWN_UPLOAD);

        const image = await fs.promises.readFile(await this.coreService.getUploadPath(upload));
        const blookifiedImage = await blookifyImage(image);

        const newUpload = await this.coreService.userUploadFile(userId, { buffer: blookifiedImage, originalname: "avatar.webp" });

        await this.prismaService.user.update({
            data: { customAvatar: { connect: { id: newUpload.id } } },
            where: { id: userId }
        });

        return newUpload;
    }
}
