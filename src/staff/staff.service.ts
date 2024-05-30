import { Injectable } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { Resource, Rarity, Pack, Blook } from "src/models";
import { Repository } from "sequelize-typescript";
import {
    StaffAdminCreateResourceDto,
    StaffAdminCreateBlookDto,
    StaffAdminUpdateBlookDto,
    StaffAdminCreatePackDto,
    StaffAdminUpdatePackDto,
    StaffAdminUpdatePackPrioritiesDto,
    StaffAdminUpdateBlookPrioritiesDto
} from "blacket-types";
import { Op, literal } from "sequelize";

@Injectable()
export class StaffService {
    private resourceRepo: Repository<Resource>;
    private rarityRepo: Repository<Rarity>;
    private packRepo: Repository<Pack>;
    private blookRepo: Repository<Blook>;

    constructor(
        private readonly sequelizeService: SequelizeService,
        private readonly redisService: RedisService
    ) {
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
        this.rarityRepo = this.sequelizeService.getRepository(Rarity);
        this.packRepo = this.sequelizeService.getRepository(Pack);
        this.blookRepo = this.sequelizeService.getRepository(Blook);
    }

    async getResources() {
        return await this.resourceRepo.findAll();
    }

    async getRarities() {
        return await this.rarityRepo.findAll();
    }

    async getPacks() {
        return await this.packRepo.findAll({ order: [["priority", "ASC"]] });
    }

    async getBlooks() {
        return await this.blookRepo.findAll({ order: [["priority", "ASC"]] });
    }

    async createResource(userId: string, dto: StaffAdminCreateResourceDto) {
        return await this.resourceRepo.create(dto);
    }

    async deleteResource(userId: string, resourceId: number) {
        return await this.resourceRepo.destroy({ where: { id: resourceId } });
    }

    async createPack(userId: string, dto: StaffAdminCreatePackDto) {
        await this.resourceRepo.findByPk(dto.imageId);

        const lastPack = await this.packRepo.findOne({
            order: [["priority", "DESC"]]
        });

        return await this.packRepo.create({
            ...dto,
            priority: lastPack ? lastPack.priority + 1 : 1
        });
    }

    async updatePack(userId: string, packId: number, dto: StaffAdminUpdatePackDto) {
        await this.packRepo.findByPk(packId);
        await this.resourceRepo.findByPk(dto.imageId);

        return await this.packRepo.update(dto, { where: { id: packId } });
    }

    async updatePackPriorities(userId: string, dto: StaffAdminUpdatePackPrioritiesDto) {
        const packs = await this.getPacks();

        const transaction = await this.sequelizeService.transaction();

        for (const pack of packs) {
            if (!dto.packMap.find((packMap) => packMap.packId === pack.id)) throw new Error(`Pack with id ${pack.id} is not in the packMap`);

            const newPriority = dto.packMap.find((packMap) => packMap.packId === pack.id).priority;
            await pack.update({ priority: newPriority }, { transaction });
        }

        await transaction.commit();
    }

    async deletePack(userId: string, packId: number) {
        return await this.packRepo.destroy({ where: { id: packId } });
    }

    async createBlook(userId: string, dto: StaffAdminCreateBlookDto) {
        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);
        await this.resourceRepo.findByPk(dto.backgroundId);

        const lastBlook = await this.blookRepo.findOne({
            order: [["priority", "DESC"]],
            where: { packId: dto.packId ?? null }
        });

        return await this.blookRepo.create({
            ...dto,
            priority: lastBlook ? lastBlook.priority + 1 : 1
        });
    }

    async updateBlook(userId: string, blookId: number, dto: StaffAdminUpdateBlookDto) {
        await this.blookRepo.findByPk(blookId);

        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);
        await this.resourceRepo.findByPk(dto.backgroundId);

        return await this.blookRepo.update(dto, { where: { id: blookId } });
    }

    async updateBlookPriorities(userId: string, dto: StaffAdminUpdateBlookPrioritiesDto) {
        const blooks = await this.blookRepo.findAll();

        const transaction = await this.sequelizeService.transaction();

        for (const blookMap of dto.blookMap) {
            if (!blooks.find((blook) => blook.id === blookMap.blookId)) throw new Error(`Blook with id ${blookMap.blookId} is not in the blooks`);

            const blook = blooks.find((blook) => blook.id === blookMap.blookId);
            await blook.update({ priority: blookMap.priority }, { transaction });
        }

        await transaction.commit();
    }

    async deleteBlook(userId: string, blookId: number) {
        return await this.blookRepo.destroy({ where: { id: blookId } });
    }
}
