import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { UsersService } from "src/users/users.service";
import { Repository } from "sequelize-typescript";

import { Blook, User, UserBlook, BlooksSellBlookDto, NotFound, Forbidden } from "blacket-types";

@Injectable()
export class BlooksService {
    private userBlookRepo: Repository<UserBlook>;

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService,
        private usersService: UsersService
    ) {
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
    }

    async getBlookById(blookId: Blook["id"]): Promise<Blook> {
        const blook = this.redisService.getBlook(blookId);
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        return blook;
    }

    async getBlookByName(blookName: Blook["name"]): Promise<Blook> {
        const blook = this.redisService.getBlook(blookName.toLowerCase());
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        return blook;
    }

    async sellBlooks(userId: User["id"], dto: BlooksSellBlookDto): Promise<void> {
        const blook = await this.getBlookById(dto.blookId);

        const transaction = await this.sequelizeService.transaction();

        const userBlookCount = await this.userBlookRepo.count({
            where: {
                userId,
                blookId: dto.blookId,
                sold: false
            },
            transaction
        });

        if (userBlookCount < dto.quantity) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

        const userBlooks = await this.userBlookRepo.findAll({
            where: {
                userId,
                blookId: dto.blookId,
                sold: false
            },
            limit: dto.quantity,
            order: [["createdAt", "DESC"]],
            attributes: ["id"],
            transaction
        });

        const [affectedRows] = await this.userBlookRepo.update({ sold: true }, {
            where: {
                userId,
                id: userBlooks.map((blook) => blook.id)
            },
            transaction
        });

        await this.usersService.addTokens(userId, blook.price * affectedRows, transaction);

        await transaction.commit();
    }
}
