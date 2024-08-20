import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import {
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

@Injectable()
export class StaffService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService
    ) { }

    getResources() {
        return this.prismaService.resource.findMany();
    }

    getGroups() {
        return this.prismaService.group.findMany();
    }

    getRarities() {
        return this.prismaService.rarity.findMany();
    }

    getPacks() {
        return this.prismaService.pack.findMany({ orderBy: { priority: "asc" } });
    }

    getBlooks() {
        return this.prismaService.blook.findMany({ orderBy: { priority: "asc" } });
    }

    getItems() {
        return this.prismaService.item.findMany({ orderBy: { priority: "asc" } });
    }

    getItemShop() {
        return this.prismaService.itemShop.findMany({ orderBy: { priority: "asc" } });
    }

    async createResource(userId: string, dto: StaffAdminCreateResourceDto) {
        const resource = await this.prismaService.resource.create({
            data: dto
        });

        await this.redisService.setResource(resource.id, resource);

        return resource;
    }

    async updateResource(userId: string, resourceId: number, dto: StaffAdminUpdateResourceDto) {
        await this.redisService.setResource(resourceId, dto);

        return this.prismaService.resource.update({ data: dto, where: { id: resourceId } });
    }

    async deleteResource(userId: string, resourceId: number) {
        await this.redisService.deleteResource(resourceId);

        try {
            return this.prismaService.resource.delete({ where: { id: resourceId } });
        } catch (e) {
            console.error("BAD ERROR ->> FIX", e);
            throw new InternalServerErrorException();
        }
    }

    async createGroup(userId: string, dto: StaffAdminCreateGroupDto) {
        if (dto.imageId) await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });

        const lastGroup = await this.prismaService.group.findFirst({
            orderBy: { priority: "desc" }
        });

        const group = await this.prismaService.group.create({
            data: {
                image: { connect: { id: dto.imageId ?? 1 } },
                description: dto.description,
                name: dto.name,
                priority: lastGroup ? lastGroup.priority + 1 : 1
            }
        });

        await this.redisService.setGroup(group.id, group);

        return group;
    }

    async updateGroup(userId: string, groupId: number, dto: StaffAdminUpdateGroupDto) {
        await this.prismaService.group.findUnique({ where: { id: groupId } });
        if (dto.imageId) await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });

        await this.redisService.setGroup(groupId, dto);

        return this.prismaService.group.update({
            data: {
                image: dto.imageId ? { connect: { id: dto.imageId } } : null,
                description: dto.description,
                name: dto.name
            }, where: { id: groupId }
        });
    }

    async updateGroupPriorities(userId: string, dto: StaffAdminUpdateGroupPrioritiesDto) {
        const groups = await this.prismaService.group.findMany();

        // const transaction = await this.sequelizeService.transaction();

        // for (const groupMap of dto.groupMap) {
        //     if (!groups.find((group) => group.id === groupMap.groupId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

        //     const group = groups.find((group) => group.id === groupMap.groupId);
        //     await group.update({ priority: groupMap.priority }, { transaction });

        //     await this.redisService.setGroup(group.id, group);
        // }
        await this.prismaService.$transaction(async (prisma) => {
            for (const groupMap of dto.groupMap) {
                if (!groups.find((group) => group.id === groupMap.groupId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

                const group = groups.find((group) => group.id === groupMap.groupId);
                await prisma.group.update({ where: { id: group.id }, data: { priority: groupMap.priority } });

                await this.redisService.setGroup(group.id, group);
            }
        });
    }

    async deleteGroup(userId: string, groupId: number) {
        await this.redisService.deleteGroup(groupId);

        return this.prismaService.group.delete({ where: { id: groupId } })
            .catch((error) => {
                throw error;
            });
    }

    async createRarity(userId: string, dto: StaffAdminCreateRarityDto) {
        const rarity = await this.prismaService.rarity.create({
            data: {
                // FIXME
                ...dto
            }
        });

        await this.redisService.setRarity(rarity.id, rarity);

        return rarity;
    }

    async updateRarity(userId: string, rarityId: number, dto: StaffAdminUpdateRarityDto) {
        await this.redisService.setRarity(rarityId, dto);
        return this.prismaService.rarity.update({ data: dto, where: { id: rarityId } });
    }

    async deleteRarity(userId: string, rarityId: number) {
        await this.redisService.deleteRarity(rarityId);

        return this.prismaService.rarity.delete({ where: { id: rarityId } })
            .catch((error) => {
                throw error;
            });
    }

    async createPack(userId: string, dto: StaffAdminCreatePackDto) {
        await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });

        const lastPack = await this.prismaService.pack.findFirst({
            orderBy: { priority: "desc" }
        });

        const pack = await this.prismaService.pack.create({
            data: {
                ...dto,
                priority: lastPack ? lastPack.priority + 1 : 1
            }
        });

        await this.redisService.setPack(pack.id, pack);

        return pack;
    }

    async updatePack(userId: string, packId: number, dto: StaffAdminUpdatePackDto) {
        await this.prismaService.pack.findUnique({ where: { id: packId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });

        await this.redisService.setPack(packId, dto);

        return this.prismaService.pack.update({ data: dto, where: { id: packId } });
    }

    async updatePackPriorities(userId: string, dto: StaffAdminUpdatePackPrioritiesDto) {
        const packs = await this.getPacks();

        // const transaction = await this.sequelizeService.transaction();

        // for (const pack of packs) {
        //     if (!dto.packMap.find((packMap) => packMap.packId === pack.id)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

        //     const newPriority = dto.packMap.find((packMap) => packMap.packId === pack.id).priority;
        //     await pack.update({ priority: newPriority }, { transaction });

        //     await this.redisService.setPack(pack.id, pack);
        // }

        // await transaction.commit();
        await this.prismaService.$transaction(async (prisma) => {
            for (const packMap of dto.packMap) {
                if (!packs.find((pack) => pack.id === packMap.packId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

                const pack = packs.find((pack) => pack.id === packMap.packId);
                await prisma.pack.update({ where: { id: pack.id }, data: { priority: packMap.priority } });

                await this.redisService.setPack(pack.id, pack);
            }
        });
    }

    async deletePack(userId: string, packId: number) {
        await this.prismaService.blook.deleteMany({ where: { packId } });

        return this.prismaService.pack.delete({ where: { id: packId } });
    }

    async createBlook(userId: string, dto: StaffAdminCreateBlookDto) {
        await this.prismaService.rarity.findUnique({ where: { id: dto.rarityId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.backgroundId } });

        const lastBlook = await this.prismaService.blook.findFirst({
            orderBy: { priority: "desc" },
            where: { packId: dto.packId }
        });

        const blook = await this.prismaService.blook.create({
            data: {
                ...dto,
                priority: lastBlook ? lastBlook.priority + 1 : 1
            }
        });

        await this.redisService.setBlook(blook.id, blook);

        return blook;
    }

    async updateBlook(userId: string, blookId: number, dto: StaffAdminUpdateBlookDto) {
        await this.prismaService.blook.findUnique({ where: { id: blookId } });

        await this.prismaService.rarity.findUnique({ where: { id: dto.rarityId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.backgroundId } });
        await this.redisService.setBlook(blookId, dto);

        return await this.prismaService.blook.update({
            data: {
                name: dto.name,
                // TODO: make some sort of helper function to reduce boilerplate here
                rarity: dto.rarityId ? { connect: { id: dto.rarityId } } : null,
                pack: dto.packId ? { connect: { id: dto.packId } } : null,
                background: dto.backgroundId ? { connect: { id: dto.backgroundId } } : null,
                image: dto.imageId ? { connect: { id: dto.imageId } } : null,
                onlyOnDay: dto.onlyOnDay
            }, where: { id: blookId }
        });
    }

    async updateBlookPriorities(userId: string, dto: StaffAdminUpdateBlookPrioritiesDto) {
        const blooks = await this.prismaService.blook.findMany();

        this.prismaService.$transaction(async (prisma) => {
            for (const blookMap of dto.blookMap) {
                if (!blooks.find((blook) => blook.id === blookMap.blookId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

                const blook = blooks.find((blook) => blook.id === blookMap.blookId);
                await prisma.blook.update({ where: { id: blook.id }, data: { priority: blookMap.priority } });

                await this.redisService.setBlook(blook.id, blook);
            }
        });
    }

    async deleteBlook(userId: string, blookId: number) {
        await this.redisService.deleteBlook(blookId);

        await this.prismaService.userBlook.deleteMany({ where: { blookId } });

        return this.prismaService.blook.delete({ where: { id: blookId } });
    }

    async createItem(userId: string, dto: StaffAdminCreateItemDto) {
        await this.prismaService.rarity.findUnique({ where: { id: dto.rarityId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });

        const lastItem = await this.prismaService.item.findFirst({
            orderBy: { priority: "desc" }
        });

        const item = await this.prismaService.item.create({
            data: {
                boosterDuration: dto.boosterDuration,
                canAuction: dto.canAuction,
                canUse: dto.canUse,
                canTrade: dto.canTrade,
                maxUses: dto.maxUses,
                description: dto.description,
                resource: { connect: { id: dto.imageId } },
                name: dto.name,
                rarity: {
                    connect: { id: dto.rarityId }
                },
                priority: lastItem ? lastItem.priority + 1 : 1
            }
        });

        await this.redisService.setItem(item.id, item);

        return item;
    }

    async updateItem(userId: string, itemId: number, dto: StaffAdminUpdateItemDto) {
        await this.prismaService.item.findUnique({ where: { id: itemId } });

        await this.prismaService.rarity.findUnique({ where: { id: dto.rarityId } });
        await this.prismaService.resource.findUnique({ where: { id: dto.imageId } });

        // FIXME
        await this.redisService.setItem(itemId, dto);

        return this.prismaService.item.update({
            data: {
                boosterDuration: dto.boosterDuration,
                canAuction: dto.canAuction,
                canUse: dto.canUse,
                canTrade: dto.canTrade,
                maxUses: dto.maxUses,
                description: dto.description,
                resource: { connect: { id: dto.imageId } },
                name: dto.name,
                rarity: { connect: { id: dto.rarityId } }
            }, where: { id: itemId }
        });
    }

    async updateItemPriorities(userId: string, dto: StaffAdminUpdateItemPrioritiesDto) {
        const items = await this.prismaService.item.findMany();

        // const transaction = await this.sequelizeService.transaction();

        // for (const itemMap of dto.itemMap) {
        //     if (!items.find((item) => item.id === itemMap.itemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

        //     const item = items.find((item) => item.id === itemMap.itemId);
        //     await item.update({ priority: itemMap.priority }, { transaction });

        //     await this.redisService.setItem(item.id, item);
        // }

        // await transaction.commit();
        await this.prismaService.$transaction(async (prisma) => {
            for (const itemMap of dto.itemMap) {
                if (!items.find((item) => item.id === itemMap.itemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

                const item = items.find((item) => item.id === itemMap.itemId);
                await prisma.item.update({ where: { id: item.id }, data: { priority: itemMap.priority } });

                await this.redisService.setItem(item.id, item);
            }
        });
    }

    async deleteItem(userId: string, itemId: number) {
        await this.redisService.deleteItem(itemId);

        return this.prismaService.item.delete({ where: { id: itemId } });
    }

    async createItemShopItem(userId: string, dto: StaffAdminCreateItemShopItemDto) {
        const lastItemShopItem = await this.prismaService.itemShop.findFirst({
            orderBy: { priority: "desc" }
        });

        const itemShopItem = await this.prismaService.itemShop.create({
            data: {
                item: { connect: { id: dto.itemId } },
                blook: { connect: { id: dto.blookId } },
                title: { connect: { id: dto.titleId } },
                enabled: dto.enabled,
                weekly: dto.weekly,
                price: dto.price,
                // FIXME
                type: dto.type,
                priority: lastItemShopItem ? lastItemShopItem.priority + 1 : 1
            }
        });

        await this.redisService.setItemShopItem(itemShopItem.id, itemShopItem);

        return itemShopItem;
    }

    async updateItemShopItem(userId: string, itemShopItemId: number, dto: StaffAdminUpdateItemShopItemDto) {
        // FIXME
        await this.redisService.setItemShopItem(itemShopItemId, dto);

        return this.prismaService.itemShop.update({
            data: {
                item: { connect: { id: dto.itemId } },
                blook: { connect: { id: dto.blookId } },
                title: { connect: { id: dto.titleId } },
                enabled: dto.enabled,
                weekly: dto.weekly,
                price: dto.price,
                // FIXME
                type: dto.type
            }, where: { id: itemShopItemId }
        });
    }

    async updateItemShopItemPriorities(userId: string, dto: StaffAdminUpdateItemShopItemPriorities) {
        const itemShopItems = await this.prismaService.itemShop.findMany();

        // const transaction = await this.sequelizeService.transaction();

        // for (const itemShopItemMap of dto.itemShopItemMap) {
        //     if (!itemShopItems.find((itemShopItem) => itemShopItem.id === itemShopItemMap.itemShopItemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

        //     const itemShopItem = itemShopItems.find((itemShopItem) => itemShopItem.id === itemShopItemMap.itemShopItemId);
        //     await itemShopItem.update({ priority: itemShopItemMap.priority }, { transaction });

        //     await this.redisService.setItemShopItem(itemShopItem.id, itemShopItem);
        // }

        // await transaction.commit();
        this.prismaService.$transaction(async (prisma) => {
            for (const itemShopItemMap of dto.itemShopItemMap) {
                if (!itemShopItems.find((itemShopItem) => itemShopItem.id === itemShopItemMap.itemShopItemId)) throw new BadRequestException(BadRequest.STAFF_ADMIN_INVALID_PRIORITIES);

                const itemShopItem = itemShopItems.find((itemShopItem) => itemShopItem.id === itemShopItemMap.itemShopItemId);
                await prisma.itemShop.update({ where: { id: itemShopItem.id }, data: { priority: itemShopItemMap.priority } });

                await this.redisService.setItemShopItem(itemShopItem.id, itemShopItem);
            }
        });
    }

    async deleteItemShopItem(userId: string, itemShopItemId: number) {
        await this.redisService.deleteItemShopItem(itemShopItemId);

        return this.prismaService.itemShop.delete({ where: { id: itemShopItemId } });
    }
}
