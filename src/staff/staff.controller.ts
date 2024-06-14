import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StaffService } from "./staff.service";
import { GetCurrentUser } from "src/core/decorator";
import {
    StaffAdminCreateResourceDto,
    StaffAdminCreateBlookDto,
    StaffAdminUpdateBlookDto,
    StaffAdminCreatePackDto,
    StaffAdminUpdatePackDto,
    StaffAdminUpdatePackPrioritiesDto,
    StaffAdminUpdateBlookPrioritiesDto,
    StaffAdminCreateRarityDto,
    StaffAdminUpdateRarityDto
} from "blacket-types";

@ApiTags("staff")
@Controller("staff")
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get("admin/resources")
    async getResources() {
        return await this.staffService.getResources();
    }

    @Post("admin/resources")
    async createResource(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateResourceDto) {
        return await this.staffService.createResource(userId, dto);
    }

    @Put("admin/resources/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateResource(@GetCurrentUser() userId: string, @Param("id") resourceId: number, @Body() dto: StaffAdminCreateResourceDto) {
        return await this.staffService.updateResource(userId, resourceId, dto);
    }

    @Delete("admin/resources/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteResource(@GetCurrentUser() userId: string, @Param("id") resourceId: number) {
        return await this.staffService.deleteResource(userId, resourceId);
    }

    @Get("admin/rarities")
    async getRarities() {
        return await this.staffService.getRarities();
    }

    @Post("admin/rarities")
    async createRarity(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateRarityDto) {
        return await this.staffService.createRarity(userId, dto);
    }

    @Put("admin/rarities/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateRarity(@GetCurrentUser() userId: string, @Param("id") rarityId: number, @Body() dto: StaffAdminUpdateRarityDto) {
        return await this.staffService.updateRarity(userId, rarityId, dto);
    }

    @Delete("admin/rarities/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRarity(@GetCurrentUser() userId: string, @Param("id") rarityId: number) {
        return await this.staffService.deleteRarity(userId, rarityId);
    }

    @Get("admin/packs")
    async getPacks() {
        return await this.staffService.getPacks();
    }

    @Post("admin/packs")
    async createPack(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreatePackDto) {
        return await this.staffService.createPack(userId, dto);
    }

    @Put("admin/packs/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updatePackPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdatePackPrioritiesDto) {
        return await this.staffService.updatePackPriorities(userId, dto);
    }

    @Put("admin/packs/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updatePack(@GetCurrentUser() userId: string, @Param("id") packId: number, @Body() dto: StaffAdminUpdatePackDto) {
        return await this.staffService.updatePack(userId, packId, dto);
    }

    @Delete("admin/packs/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePack(@GetCurrentUser() userId: string, @Param("id") packId: number) {
        return await this.staffService.deletePack(userId, packId);
    }

    @Get("admin/blooks")
    async getBlooks() {
        return await this.staffService.getBlooks();
    }

    @Post("admin/blooks")
    async createBlook(@GetCurrentUser() userId: string, @Body() dto: StaffAdminCreateBlookDto) {
        return await this.staffService.createBlook(userId, dto);
    }

    @Put("admin/blooks/update-priorities")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateBlookPriorities(@GetCurrentUser() userId: string, @Body() dto: StaffAdminUpdateBlookPrioritiesDto) {
        return await this.staffService.updateBlookPriorities(userId, dto);
    }

    @Put("admin/blooks/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateBlook(@GetCurrentUser() userId: string, @Param("id") blookId: number, @Body() dto: StaffAdminUpdateBlookDto) {
        return await this.staffService.updateBlook(userId, blookId, dto);
    }

    @Delete("admin/blooks/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteBlook(@GetCurrentUser() userId: string, @Param("id") blookId: number) {
        return await this.staffService.deleteBlook(userId, blookId);
    }

    @Get("admin/items")
    async getItems() {
        return await this.staffService.getItems();
    }
}
