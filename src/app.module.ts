import { APP_GUARD } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, seconds } from "@nestjs/throttler";

import { LoggerModule } from "./core/logger/logger.module";
import { SequelizeModule } from "./sequelize/sequelize.module";
import { RedisModule } from "./redis/redis.module";
import { SocketModule } from "./socket/socket.module";
import { DefaultModule } from "./default/default.module";
import { DataModule } from "./data/data.module";
import { AuthModule } from "./auth/auth.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { UsersModule } from "./users/users.module";
import { FormsModule } from "./forms/forms.module";
import { StaffModule } from "./staff/staff.module";
import { ChatModule } from "./chat/chat.module";
import { QuestsModule } from "./quests/quests.module";
import { BlooksModule } from "./blooks/blooks.module";
import { MarketModule } from "./market/market.module";
import { SettingsModule } from "./settings/settings.module";
import { DiscordModule } from "./discord/discord.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";

import { AuthGuard } from "./core/guard";
import { UserThrottlerGuard } from "./core/guard";

import { ThrottlerStorageRedisService } from "nestjs-throttler-storage-redis";
import { RedisService } from "./redis/redis.service";
import { PermissionsService } from "./permissions/permissions.service";
import { IsAccessCode } from "./core/validate/";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: "../.env" }),
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: seconds(60), limit: 100 }],
            storage: new ThrottlerStorageRedisService(new RedisService())
        }),

        LoggerModule,
        SequelizeModule,
        RedisModule,
        SocketModule,
        DefaultModule,
        DataModule,
        AuthModule,
        PermissionsModule,
        UsersModule,
        FormsModule,
        StaffModule,
        ChatModule,
        QuestsModule,
        BlooksModule,
        MarketModule,
        SettingsModule,
        DiscordModule,
        LeaderboardModule
    ],
    controllers: [],
    providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: UserThrottlerGuard },

        PermissionsService,

        IsAccessCode
    ]
})
export class AppModule { }
