import { BadRequestException, Body, ClassSerializerInterceptor, Controller, Get, Param, HttpCode, HttpStatus, Post, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FormsService } from "./forms.service";
import { Public, RealIp } from "src/core/decorator";

import { FormAlreadyExistsException, FormNotFoundException } from "./exception";
import { ApiResponse, ApiTags } from "@nestjs/swagger";

import { BadRequest, Conflict, FormsCreateDto, FormsCreateFormEntity, FormsGetFormEntity, NotFound } from "blacket-types";

@ApiTags("forms")
@Controller("forms")
export class FormsController {
    constructor(
        private configService: ConfigService,
        private formsService: FormsService
    ) { }

    @Public()
    @UseInterceptors(ClassSerializerInterceptor)
    @Post("create")
    @HttpCode(HttpStatus.CREATED)
    @ApiResponse({ status: HttpStatus.CREATED, description: "Form created successfully", type: FormsCreateFormEntity })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: BadRequest.FORMS_FORMS_DISABLED })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: Conflict.FORMS_ALREADY_EXISTS })
    async createForm(@Body() dto: FormsCreateDto, @RealIp() ipAddress: string) {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") !== "true") throw new BadRequestException(BadRequest.FORMS_FORMS_DISABLED);

        const form = await this.formsService.createForm(dto, ipAddress);

        if (!form) throw new FormAlreadyExistsException();

        return new FormsCreateFormEntity(form);
    }

    @Public()
    @UseInterceptors(ClassSerializerInterceptor)
    @Get(":id")
    @ApiResponse({ status: HttpStatus.OK, description: "Form found", type: FormsGetFormEntity })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: BadRequest.FORMS_FORMS_DISABLED })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: NotFound.UNKNOWN_FORM })
    async getForm(@Param("id") id: string) {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") !== "true") throw new BadRequestException(BadRequest.FORMS_FORMS_DISABLED);

        const form = await this.formsService.getFormById(id);

        if (!form) throw new FormNotFoundException();

        return new FormsGetFormEntity(form);
    }
}
