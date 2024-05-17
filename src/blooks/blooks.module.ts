import { Module } from "@nestjs/common";
import { BlooksService } from "./blooks.service";
import { BlooksController } from "./blooks.controller";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [UsersModule],
    providers: [BlooksService],
    controllers: [BlooksController]
})
export class BlooksModule { }
