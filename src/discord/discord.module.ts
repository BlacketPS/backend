import { Module } from "@nestjs/common";
import { DiscordController } from "./discord.controller";
import { DiscordService } from "./discord.service";
import { HttpModule } from "@nestjs/axios";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [HttpModule, UsersModule],
    controllers: [DiscordController],
    providers: [DiscordService]
})
export class DiscordModule {}
