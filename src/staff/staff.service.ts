import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { Repository } from "sequelize-typescript";
import {
    Resource,
    Rarity,
    Pack,
    Blook,
    Item,
    UserBlook,
    Conflict,
    BadRequest,
    StaffAdminCreateResourceDto,
    StaffAdminUpdateResourceDto,
    StaffAdminCreateBlookDto,
    StaffAdminUpdateBlookDto,
    StaffAdminCreatePackDto,
    StaffAdminUpdatePackDto,
    StaffAdminUpdatePackPrioritiesDto,
    StaffAdminUpdateBlookPrioritiesDto,
    StaffAdminCreateRarityDto,
    StaffAdminUpdateRarityDto,
    StaffAdminCreateItemDto,
    StaffAdminUpdateItemDto,
    StaffAdminUpdateItemPrioritiesDto
} from "blacket-types";
import { ForeignKeyConstraintError } from "sequelize";

@Injectable()
export class StaffService {
    private resourceRepo: Repository<Resource>;
    private rarityRepo: Repository<Rarity>;
    private packRepo: Repository<Pack>;
    private blookRepo: Repository<Blook>;
    private itemRepo: Repository<Item>;
    private userBlookRepo: Repository<UserBlook>;

    constructor(
        private readonly sequelizeService: SequelizeService,
        private readonly redisService: RedisService
    ) {
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
        this.rarityRepo = this.sequelizeService.getRepository(Rarity);
        this.packRepo = this.sequelizeService.getRepository(Pack);
        this.blookRepo = this.sequelizeService.getRepository(Blook);
        this.itemRepo = this.sequelizeService.getRepository(Item);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
    }

    getResources() {
        return this.resourceRepo.findAll();
    }

    getRarities() {
        return this.rarityRepo.findAll();
    }

    getPacks() {
        return this.packRepo.findAll({ order: [["priority", "ASC"]] });
    }

    getBlooks() {
        return this.blookRepo.findAll({ order: [["priority", "ASC"]] });
    }

    getItems() {
        return this.itemRepo.findAll({ order: [["priority", "ASC"]] });
    }

    createResource(userId: string, dto: StaffAdminCreateResourceDto) {
        return this.resourceRepo.create(dto);
    }

    updateResource(userId: string, resourceId: number, dto: StaffAdminUpdateResourceDto) {
        return this.resourceRepo.update(dto, { where: { id: resourceId } });
    }

    deleteResource(userId: string, resourceId: number) {
        return this.resourceRepo.destroy({ where: { id: resourceId } })
            .catch((error) => {
                if (error instanceof ForeignKeyConstraintError) throw new ConflictException(Conflict.STAFF_ADMIN_RESOURCE_IN_USE);
                else throw error;
            });
    }

    createRarity(userId: string, dto: StaffAdminCreateRarityDto) {
        return this.rarityRepo.create(dto);
    }

    updateRarity(userId: string, rarityId: number, dto: StaffAdminUpdateRarityDto) {
        return this.rarityRepo.update(dto, { where: { id: rarityId } });
    }

    deleteRarity(userId: string, rarityId: number) {
        return this.rarityRepo.destroy({ where: { id: rarityId } })
            .catch((error) => {
                if (error instanceof ForeignKeyConstraintError) throw new ConflictException(Conflict.STAFF_ADMIN_RARITY_IN_USE);
                else throw error;
            });
    }

    async createPack(userId: string, dto: StaffAdminCreatePackDto) {
        await this.resourceRepo.findByPk(dto.imageId);

        const lastPack = await this.packRepo.findOne({
            order: [["priority", "DESC"]]
        });

        return this.packRepo.create({
            ...dto,
            priority: lastPack ? lastPack.priority + 1 : 1
        });
    }

    async updatePack(userId: string, packId: number, dto: StaffAdminUpdatePackDto) {
        await this.packRepo.findByPk(packId);
        await this.resourceRepo.findByPk(dto.imageId);

        return this.packRepo.update(dto, { where: { id: packId } });
    }

    async updatePackPriorities(userId: string, dto: StaffAdminUpdatePackPrioritiesDto) {
        const packs = await this.getPacks();

        const transaction = await this.sequelizeService.transaction();

        for (const pack of packs) {
            if (!dto.packMap.find((packMap) => packMap.packId === pack.id)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const newPriority = dto.packMap.find((packMap) => packMap.packId === pack.id).priority;
            await pack.update({ priority: newPriority }, { transaction });
        }

        await transaction.commit();
    }

    deletePack(userId: string, packId: number) {
        return this.packRepo.destroy({ where: { id: packId } });
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
            if (!blooks.find((blook) => blook.id === blookMap.blookId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const blook = blooks.find((blook) => blook.id === blookMap.blookId);
            await blook.update({ priority: blookMap.priority }, { transaction });
        }

        await transaction.commit();
    }

    async deleteBlook(userId: string, blookId: number) {
        await this.userBlookRepo.destroy({ where: { blookId } });

        return this.blookRepo.destroy({ where: { id: blookId } });
    }

    async createItem(userId: string, dto: StaffAdminCreateItemDto) {
        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);

        const lastItem = await this.itemRepo.findOne({
            order: [["priority", "DESC"]]
        });

        return this.itemRepo.create({
            ...dto,
            priority: lastItem ? lastItem.priority + 1 : 1
        });
    }

    async updateItem(userId: string, itemId: number, dto: StaffAdminUpdateItemDto) {
        await this.itemRepo.findByPk(itemId);

        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);

        return this.itemRepo.update(dto, { where: { id: itemId } });
    }

    async updateItemPriorities(userId: string, dto: StaffAdminUpdateItemPrioritiesDto) {
        const items = await this.itemRepo.findAll();

        const transaction = await this.sequelizeService.transaction();

        for (const itemMap of dto.itemMap) {
            if (!items.find((item) => item.id === itemMap.itemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const item = items.find((item) => item.id === itemMap.itemId);
            await item.update({ priority: itemMap.priority }, { transaction });
        }

        await transaction.commit();
    }

    deleteItem(userId: string, itemId: number) {
        return this.itemRepo.destroy({ where: { id: itemId } });
    }
}
