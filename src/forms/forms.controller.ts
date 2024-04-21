import { BadRequestException, Body, ClassSerializerInterceptor, Controller, Get, Param, HttpCode, HttpStatus, Post, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FormsService } from "./forms.service";
import { Public, RealIp } from "src/core/decorator";

import { FormAlreadyExistsException, FormNotFoundException } from "./exception";
import { ApiTags } from "@nestjs/swagger";
import { BadRequest, CreateDto, CreateFormEntity, GetFormEntity } from "blacket-types";

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
    async createForm(@Body() dto: CreateDto, @RealIp() ipAddress: string) {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") !== "true") throw new BadRequestException(BadRequest.FORMS_FORMS_DISABLED);

        const form = await this.formsService.createForm(dto.username, dto.password, dto.reasonToPlay, ipAddress);

        if (!form) throw new FormAlreadyExistsException();

        return { form: new CreateFormEntity(form.toJSON()) };
    }

    @Public()
    @UseInterceptors(ClassSerializerInterceptor)
    @Get(":id")
    async getForm(@Param("id") id: string) {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") !== "true") throw new BadRequestException(BadRequest.FORMS_FORMS_DISABLED);

        const form = await this.formsService.getFormById(id);

        if (!form) throw new FormNotFoundException();

        return { form: new GetFormEntity(form.toJSON()) };
    }
}
