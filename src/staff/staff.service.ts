import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { Repository } from "sequelize-typescript";
import {
    Resource,
    Group,
    Rarity,
    Pack,
    Blook,
    Item,
    ItemShop,
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
    StaffAdminUpdateItemPrioritiesDto,
    StaffAdminCreateItemShopItemDto,
    StaffAdminUpdateItemShopItemDto,
    StaffAdminUpdateItemShopItemPriorities,
    StaffAdminCreateGroupDto,
    StaffAdminUpdateGroupDto,
    StaffAdminUpdateGroupPrioritiesDto
} from "blacket-types";
import { ForeignKeyConstraintError } from "sequelize";

@Injectable()
export class StaffService {
    private resourceRepo: Repository<Resource>;
    private groupRepo: Repository<Group>;
    private rarityRepo: Repository<Rarity>;
    private packRepo: Repository<Pack>;
    private blookRepo: Repository<Blook>;
    private itemRepo: Repository<Item>;
    private itemShopRepo: Repository<ItemShop>;
    private userBlookRepo: Repository<UserBlook>;

    constructor(
        private readonly sequelizeService: PrismaService,
        private readonly redisService: RedisService
    ) {
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
        this.groupRepo = this.sequelizeService.getRepository(Group);
        this.rarityRepo = this.sequelizeService.getRepository(Rarity);
        this.packRepo = this.sequelizeService.getRepository(Pack);
        this.blookRepo = this.sequelizeService.getRepository(Blook);
        this.itemRepo = this.sequelizeService.getRepository(Item);
        this.itemShopRepo = this.sequelizeService.getRepository(ItemShop);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
    }

    getResources() {
        return this.resourceRepo.findAll();
    }

    getGroups() {
        return this.groupRepo.findAll();
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

    getItemShop() {
        return this.itemShopRepo.findAll({ order: [["priority", "ASC"]] });
    }

    async createResource(userId: string, dto: StaffAdminCreateResourceDto) {
        const resource = await this.resourceRepo.create(dto);

        await this.redisService.setResource(resource.id, resource);

        return resource;
    }

    async updateResource(userId: string, resourceId: number, dto: StaffAdminUpdateResourceDto) {
        await this.redisService.setResource(resourceId, dto);

        return this.resourceRepo.update(dto, { where: { id: resourceId } });
    }

    async deleteResource(userId: string, resourceId: number) {
        await this.redisService.deleteResource(resourceId);

        return this.resourceRepo.destroy({ where: { id: resourceId } })
            .catch((error) => {
                if (error instanceof ForeignKeyConstraintError) throw new ConflictException(Conflict.STAFF_ADMIN_RESOURCE_IN_USE);
                else throw error;
            });
    }

    async createGroup(userId: string, dto: StaffAdminCreateGroupDto) {
        if (dto.imageId) await this.resourceRepo.findByPk(dto.imageId);

        const lastGroup = await this.groupRepo.findOne({
            order: [["priority", "DESC"]]
        });

        const group = await this.groupRepo.create({
            ...dto,
            priority: lastGroup ? lastGroup.priority + 1 : 1
        });

        await this.redisService.setGroup(group.id, group);

        return group;
    }

    async updateGroup(userId: string, groupId: number, dto: StaffAdminUpdateGroupDto) {
        await this.groupRepo.findByPk(groupId);
        if (dto.imageId) await this.resourceRepo.findByPk(dto.imageId);

        await this.redisService.setGroup(groupId, dto);

        return this.groupRepo.update(dto, { where: { id: groupId } });
    }

    async updateGroupPriorities(userId: string, dto: StaffAdminUpdateGroupPrioritiesDto) {
        const groups = await this.groupRepo.findAll();

        const transaction = await this.sequelizeService.transaction();

        for (const groupMap of dto.groupMap) {
            if (!groups.find((group) => group.id === groupMap.groupId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const group = groups.find((group) => group.id === groupMap.groupId);
            await group.update({ priority: groupMap.priority }, { transaction });

            await this.redisService.setGroup(group.id, group);
        }

        await transaction.commit();
    }

    async deleteGroup(userId: string, groupId: number) {
        await this.redisService.deleteGroup(groupId);

        return this.groupRepo.destroy({ where: { id: groupId } })
            .catch((error) => {
                if (error instanceof ForeignKeyConstraintError) throw new ConflictException(Conflict.STAFF_ADMIN_GROUP_IN_USE);
                else throw error;
            });
    }

    async createRarity(userId: string, dto: StaffAdminCreateRarityDto) {
        const rarity = await this.rarityRepo.create(dto);

        await this.redisService.setRarity(rarity.id, rarity);

        return rarity;
    }

    async updateRarity(userId: string, rarityId: number, dto: StaffAdminUpdateRarityDto) {
        await this.redisService.setRarity(rarityId, dto);

        return this.rarityRepo.update(dto, { where: { id: rarityId } });
    }

    async deleteRarity(userId: string, rarityId: number) {
        await this.redisService.deleteRarity(rarityId);

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

        const pack = await this.packRepo.create({
            ...dto,
            priority: lastPack ? lastPack.priority + 1 : 1
        });

        await this.redisService.setPack(pack.id, pack);

        return pack;
    }

    async updatePack(userId: string, packId: number, dto: StaffAdminUpdatePackDto) {
        await this.packRepo.findByPk(packId);
        await this.resourceRepo.findByPk(dto.imageId);

        await this.redisService.setPack(packId, dto);

        return this.packRepo.update(dto, { where: { id: packId } });
    }

    async updatePackPriorities(userId: string, dto: StaffAdminUpdatePackPrioritiesDto) {
        const packs = await this.getPacks();

        const transaction = await this.sequelizeService.transaction();

        for (const pack of packs) {
            if (!dto.packMap.find((packMap) => packMap.packId === pack.id)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const newPriority = dto.packMap.find((packMap) => packMap.packId === pack.id).priority;
            await pack.update({ priority: newPriority }, { transaction });

            await this.redisService.setPack(pack.id, pack);
        }

        await transaction.commit();
    }

    async deletePack(userId: string, packId: number) {
        await this.blookRepo.destroy({ where: { packId } });

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

        const blook = await this.blookRepo.create({
            ...dto,
            priority: lastBlook ? lastBlook.priority + 1 : 1
        });

        await this.redisService.setBlook(blook.id, blook);

        return blook;
    }

    async updateBlook(userId: string, blookId: number, dto: StaffAdminUpdateBlookDto) {
        await this.blookRepo.findByPk(blookId);

        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);
        await this.resourceRepo.findByPk(dto.backgroundId);

        await this.redisService.setBlook(blookId, dto);

        return await this.blookRepo.update(dto, { where: { id: blookId } });
    }

    async updateBlookPriorities(userId: string, dto: StaffAdminUpdateBlookPrioritiesDto) {
        const blooks = await this.blookRepo.findAll();

        const transaction = await this.sequelizeService.transaction();

        for (const blookMap of dto.blookMap) {
            if (!blooks.find((blook) => blook.id === blookMap.blookId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const blook = blooks.find((blook) => blook.id === blookMap.blookId);
            await blook.update({ priority: blookMap.priority }, { transaction });

            await this.redisService.setBlook(blook.id, blook);
        }

        await transaction.commit();
    }

    async deleteBlook(userId: string, blookId: number) {
        await this.redisService.deleteBlook(blookId);

        await this.userBlookRepo.destroy({ where: { blookId } });

        return this.blookRepo.destroy({ where: { id: blookId } });
    }

    async createItem(userId: string, dto: StaffAdminCreateItemDto) {
        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);

        const lastItem = await this.itemRepo.findOne({
            order: [["priority", "DESC"]]
        });

        const item = await this.itemRepo.create({
            ...dto,
            priority: lastItem ? lastItem.priority + 1 : 1
        });

        await this.redisService.setItem(item.id, item);

        return item;
    }

    async updateItem(userId: string, itemId: number, dto: StaffAdminUpdateItemDto) {
        await this.itemRepo.findByPk(itemId);

        await this.rarityRepo.findByPk(dto.rarityId);
        await this.resourceRepo.findByPk(dto.imageId);

        await this.redisService.setItem(itemId, dto);

        return this.itemRepo.update(dto, { where: { id: itemId } });
    }

    async updateItemPriorities(userId: string, dto: StaffAdminUpdateItemPrioritiesDto) {
        const items = await this.itemRepo.findAll();

        const transaction = await this.sequelizeService.transaction();

        for (const itemMap of dto.itemMap) {
            if (!items.find((item) => item.id === itemMap.itemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const item = items.find((item) => item.id === itemMap.itemId);
            await item.update({ priority: itemMap.priority }, { transaction });

            await this.redisService.setItem(item.id, item);
        }

        await transaction.commit();
    }

    async deleteItem(userId: string, itemId: number) {
        await this.redisService.deleteItem(itemId);

        return this.itemRepo.destroy({ where: { id: itemId } });
    }

    async createItemShopItem(userId: string, dto: StaffAdminCreateItemShopItemDto) {
        const lastItemShopItem = await this.itemShopRepo.findOne({
            order: [["priority", "DESC"]]
        });

        const itemShopItem = await this.itemShopRepo.create({
            ...dto,
            priority: lastItemShopItem ? lastItemShopItem.priority + 1 : 1
        });

        await this.redisService.setItemShopItem(itemShopItem.id, itemShopItem);

        return itemShopItem;
    }

    async updateItemShopItem(userId: string, itemShopItemId: number, dto: StaffAdminUpdateItemShopItemDto) {
        const itemShopItem = await this.itemShopRepo.findByPk(itemShopItemId);

        await this.redisService.setItemShopItem(itemShopItemId, dto);

        return itemShopItem.update(dto);
    }

    async updateItemShopItemPriorities(userId: string, dto: StaffAdminUpdateItemShopItemPriorities) {
        const itemShopItems = await this.itemShopRepo.findAll();

        const transaction = await this.sequelizeService.transaction();

        for (const itemShopItemMap of dto.itemShopItemMap) {
            if (!itemShopItems.find((itemShopItem) => itemShopItem.id === itemShopItemMap.itemShopItemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

            const itemShopItem = itemShopItems.find((itemShopItem) => itemShopItem.id === itemShopItemMap.itemShopItemId);
            await itemShopItem.update({ priority: itemShopItemMap.priority }, { transaction });

            await this.redisService.setItemShopItem(itemShopItem.id, itemShopItem);
        }

        await transaction.commit();
    }

    async deleteItemShopItem(userId: string, itemShopItemId: number) {
        await this.redisService.deleteItemShopItem(itemShopItemId);

        return this.itemShopRepo.destroy({ where: { id: itemShopItemId } });
    }
}
