import { Module } from "@nestjs/common";
import { BlooksService } from "./blooks.service";
import { BlooksController } from "./blooks.controller";

@Module({
    providers: [BlooksService],
    controllers: [BlooksController]
})
export class BlooksModule { }
