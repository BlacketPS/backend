import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { AuthModule } from "src/auth/auth.module";
import { UsersModule } from "src/users/users.module";
import { MailModule } from "src/mail/mail.module";

@Module({
    imports: [AuthModule, UsersModule, MailModule],
    providers: [SettingsService],
    controllers: [SettingsController]
})
export class SettingsModule { }
