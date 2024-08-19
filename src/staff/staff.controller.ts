import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StaffService } from "./staff.service";
import { Permissions, GetCurrentUser } from "src/core/decorator";
import {
    PermissionTypeEnum,
    StaffAdminCreateResourceDto,
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
    StaffAdminUpdateItemShopItemPriorities,
    StaffAdminUpdateItemShopItemDto,
    StaffAdminCreateGroupDto,
    StaffAdminUpdateGroupDto,
    StaffAdminUpdateGroupPrioritiesDto
} from "blacket-types";

@ApiTags("staff")
@Controller("staff")
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Permissions({ permissions: [PermissionTypeEnum.BLACKLIST_USERS] })
    @Get("admin/resources")
    async getResources() {
        return await this.staffService.getResources();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Post("admin/resources")
    async createResource(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateResourceDto) {
        return await this.staffService.createResource(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/resources/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateResource(@GetCurrentUser() userId: string, @Param("id") resourceId: number, @Body() dto: StaffAdminCreateResourceDto) {
        return await this.staffService.updateResource(userId, resourceId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Delete("admin/resources/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteResource(@GetCurrentUser() userId: string, @Param("id") resourceId: number) {
        return await this.staffService.deleteResource(userId, resourceId);
    }

    @Permissions({ permissions: [PermissionTypeEnum.BLACKLIST_USERS] })
    @Get("admin/groups")
    async getGroups() {
        return await this.staffService.getGroups();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GROUPS] })
    @Post("admin/groups")
    async createGroup(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateGroupDto) {
        return await this.staffService.createGroup(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GROUPS] })
    @Put("admin/groups/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateGroupPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdateGroupPrioritiesDto) {
        return await this.staffService.updateGroupPriorities(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GROUPS] })
    @Put("admin/groups/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateGroup(@GetCurrentUser() userId: string, @Param("id") groupId: number, @Body() dto: StaffAdminUpdateGroupDto) {
        return await this.staffService.updateGroup(userId, groupId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GROUPS] })
    @Delete("admin/groups/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteGroup(@GetCurrentUser() userId: string, @Param("id") groupId: number) {
        return await this.staffService.deleteGroup(userId, groupId);
    }

    @Permissions({ permissions: [PermissionTypeEnum.BLACKLIST_USERS] })
    @Get("admin/rarities")
    async getRarities() {
        return await this.staffService.getRarities();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Post("admin/rarities")
    async createRarity(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateRarityDto) {
        return await this.staffService.createRarity(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/rarities/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateRarity(@GetCurrentUser() userId: string, @Param("id") rarityId: number, @Body() dto: StaffAdminUpdateRarityDto) {
        return await this.staffService.updateRarity(userId, rarityId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Delete("admin/rarities/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRarity(@GetCurrentUser() userId: string, @Param("id") rarityId: number) {
        return await this.staffService.deleteRarity(userId, rarityId);
    }

    @Permissions({ permissions: [PermissionTypeEnum.BLACKLIST_USERS] })
    @Get("admin/packs")
    async getPacks() {
        return await this.staffService.getPacks();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Post("admin/packs")
    async createPack(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreatePackDto) {
        return await this.staffService.createPack(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/packs/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updatePackPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdatePackPrioritiesDto) {
        return await this.staffService.updatePackPriorities(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/packs/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updatePack(@GetCurrentUser() userId: string, @Param("id") packId: number, @Body() dto: StaffAdminUpdatePackDto) {
        return await this.staffService.updatePack(userId, packId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Delete("admin/packs/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePack(@GetCurrentUser() userId: string, @Param("id") packId: number) {
        return await this.staffService.deletePack(userId, packId);
    }

    @Permissions({ permissions: [PermissionTypeEnum.BLACKLIST_USERS] })
    @Get("admin/blooks")
    async getBlooks() {
        return await this.staffService.getBlooks();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Post("admin/blooks")
    async createBlook(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateBlookDto) {
        return await this.staffService.createBlook(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/blooks/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateBlookPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdateBlookPrioritiesDto) {
        return await this.staffService.updateBlookPriorities(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/blooks/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateBlook(@GetCurrentUser() userId: string, @Param("id") blookId: number, @Body() dto: StaffAdminUpdateBlookDto) {
        return await this.staffService.updateBlook(userId, blookId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Delete("admin/blooks/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteBlook(@GetCurrentUser() userId: string, @Param("id") blookId: number) {
        return await this.staffService.deleteBlook(userId, blookId);
    }

    @Permissions({ permissions: [PermissionTypeEnum.BLACKLIST_USERS] })
    @Get("admin/items")
    async getItems() {
        return await this.staffService.getItems();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Post("admin/items")
    async createItem(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateItemDto) {
        return await this.staffService.createItem(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/items/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateItemPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdateItemPrioritiesDto) {
        return await this.staffService.updateItemPriorities(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/items/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateItem(@GetCurrentUser() userId: string, @Param("id") itemId: number, @Body() dto: StaffAdminUpdateItemDto) {
        return await this.staffService.updateItem(userId, itemId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Delete("admin/items/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteItem(@GetCurrentUser() userId: string, @Param("id") itemId: number) {
        return await this.staffService.deleteItem(userId, itemId);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Get("admin/item-shop")
    async getItemShop() {
        return await this.staffService.getItemShop();
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Post("admin/item-shop")
    async createItemShopItem(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateItemShopItemDto) {
        return await this.staffService.createItemShopItem(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/item-shop/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateItemShopItem(@GetCurrentUser() userId: string, @Param("id") itemShopItemId: number, @Body() dto: StaffAdminUpdateItemShopItemDto) {
        return await this.staffService.updateItemShopItem(userId, itemShopItemId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Put("admin/item-shop/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateItemShopItemPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdateItemShopItemPriorities) {
        return await this.staffService.updateItemShopItemPriorities(userId, dto);
    }

    @Permissions({ permissions: [PermissionTypeEnum.MANAGE_GAME_DATA] })
    @Delete("admin/item-shop/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteItemShopItem(@GetCurrentUser() userId: string, @Param("id") itemShopItemId: number) {
        return await this.staffService.deleteItemShopItem(userId, itemShopItemId);
    }
}
