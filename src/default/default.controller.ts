import { Controller, Get } from "@nestjs/common";
import { DefaultService } from "./default.service";
import { Public } from "src/core/decorator";
import { Config } from "@blacket/types";

@Controller("")
export class DefaultController {
    constructor(
        private readonly defaultService: DefaultService
    ) {}

    @Public()
    @Get()
    get(): Config {
        return this.defaultService.get();
    }
}
