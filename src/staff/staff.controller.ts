import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StaffService } from "./staff.service";
import { GetCurrentUser } from "src/core/decorator";
import { StaffAdminCreateResourceDto, StaffAdminUpdateBlookDto } from "blacket-types";

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

    @Delete("admin/resources/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteResource(@GetCurrentUser() userId: string, @Param("id") resourceId: number) {
        return await this.staffService.deleteResource(userId, resourceId);
    }

    @Get("admin/packs")
    async getPacks() {
        return await this.staffService.getPacks();
    }

    @Get("admin/blooks")
    async getBlooks() {
        return await this.staffService.getBlooks();
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
}
