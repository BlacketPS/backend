import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { AuthModule } from "src/auth/auth.module";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [AuthModule, UsersModule],
    providers: [SettingsService],
    controllers: [SettingsController]
})
export class SettingsModule { }
