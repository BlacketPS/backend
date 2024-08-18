import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { Repository } from "sequelize-typescript";
import { CosmeticsChangeBannerDto, CosmeticsChangeColorTier1Dto, CosmeticsChangeColorTier2Dto, CosmeticsChangeFontDto, CosmeticsChangeTitleDto, UserBlook, UserTitle } from "blacket-types";
import { NotFound, Forbidden, User, CosmeticsChangeAvatarDto } from "blacket-types";

@Injectable()
export class CosmeticsService {
    private userRepo: Repository<User>;
    private userBlookRepo: Repository<UserBlook>;
    private userTitleRepo: Repository<UserTitle>;

    constructor(
        private redisService: RedisService,
        private sequelizeService: PrismaService,
        private usersService: UsersService
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
        this.userTitleRepo = this.sequelizeService.getRepository(UserTitle);
    }

    async changeAvatar(userId: string, dto: CosmeticsChangeAvatarDto) {
        const blook = await this.redisService.getBlook(dto.blookId);
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        const userBlookCount = await this.userBlookRepo.count({ where: { userId, blookId: dto.blookId, sold: false } });
        if (dto.blookId !== 1 && userBlookCount < 1) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

        await this.userRepo.update({ avatarId: blook.imageId }, { where: { id: userId } });
    }

    async changeBanner(userId: string, dto: CosmeticsChangeBannerDto) {
        const banner = await this.redisService.getBanner(dto.bannerId);
        if (!banner) throw new NotFoundException(NotFound.UNKNOWN_BANNER);

        await this.userRepo.update({ bannerId: banner.imageId }, { where: { id: userId } });
    }

    async changeTitle(userId: string, dto: CosmeticsChangeTitleDto) {
        const title = await this.redisService.getTitle(dto.titleId);
        if (!title) throw new NotFoundException(NotFound.UNKNOWN_TITLE);

        const userTitleCount = await this.userTitleRepo.count({ where: { userId, titleId: dto.titleId } });
        if (dto.titleId !== 1 && userTitleCount < 1) throw new ForbiddenException(Forbidden.COSMETICS_TITLES_NOT_OWNED);

        await this.userRepo.update({ titleId: title.id }, { where: { id: userId } });
    }

    async changeColorTier1(userId: string, dto: CosmeticsChangeColorTier1Dto) {
        await this.userRepo.update({ color: dto.color }, { where: { id: userId } });
    }

    async changeColorTier2(userId: string, dto: CosmeticsChangeColorTier2Dto) {
        await this.userRepo.update({ color: dto.color }, { where: { id: userId } });
    }

    async changeFont(userId: string, dto: CosmeticsChangeFontDto) {
        const font = await this.redisService.getFont(dto.fontId);
        if (!font) throw new NotFoundException(NotFound.UNKNOWN_FONT);

        await this.userRepo.update({ fontId: font.id }, { where: { id: userId } });
    }
}
