import { Injectable } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { Resource, Pack, Blook } from "src/models";
import { Repository } from "sequelize-typescript";
import { StaffAdminCreateResourceDto, StaffAdminUpdateBlookDto } from "blacket-types";

@Injectable()
export class StaffService {
    private resourceRepo: Repository<Resource>;
    private packRepo: Repository<Pack>;
    private blookRepo: Repository<Blook>;

    constructor(
        private readonly sequelizeService: SequelizeService,
        private readonly redisService: RedisService
    ) {
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
        this.packRepo = this.sequelizeService.getRepository(Pack);
        this.blookRepo = this.sequelizeService.getRepository(Blook);
    }

    async getResources() {
        return await this.resourceRepo.findAll();
    }

    async getPacks () {
        return await this.packRepo.findAll();
    }

    async getBlooks() {
        return await this.blookRepo.findAll();
    }

    async createResource(userId: string, dto: StaffAdminCreateResourceDto) {
        return await this.resourceRepo.create({ path: dto.path });
    }

    async deleteResource(userId: string, resourceId: number) {
        return await this.resourceRepo.destroy({ where: { id: resourceId } });
    }

    async updateBlook(userId: string, blookId: number, dto: StaffAdminUpdateBlookDto) {
        return await this.blookRepo.update(dto, { where: { id: blookId } });
    }

    async deleteBlook(userId: string, blookId: number) {
        await this.redisService.del(`blacket-blook:${blookId}`);

        return await this.blookRepo.destroy({ where: { id: blookId } });
    }
}
