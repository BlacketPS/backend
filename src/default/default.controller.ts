import { Controller, Get } from "@nestjs/common";
import { DefaultService } from "./default.service";
import { Public } from "src/core/decorator";

@Controller("")
export class DefaultController {
    constructor(
        private readonly defaultService: DefaultService
    ) {}

    @Public()
    @Get()
    get() {
        return this.defaultService.get();
    }
}
