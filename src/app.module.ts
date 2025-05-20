import { APP_GUARD } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, seconds } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { MailerModule } from "@nestjs-modules/mailer";

import { StripeModule } from "./stripe/stripe.module";

import { CoreModule } from "./core/core.module";
import { LoggerModule } from "./core/logger/logger.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { SocketModule } from "./socket/socket.module";
import { S3Module } from "./s3/s3.module";
import { DefaultModule } from "./default/default.module";
import { DataModule } from "./data/data.module";
import { AuthModule } from "./auth/auth.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { UsersModule } from "./users/users.module";
import { ChatModule } from "./chat/chat.module";
import { QuestsModule } from "./quests/quests.module";
import { BlooksModule } from "./blooks/blooks.module";
import { MarketModule } from "./market/market.module";
import { SettingsModule } from "./settings/settings.module";
import { CosmeticsModule } from "./cosmetics/cosmetics.module";
import { GuildsModule } from "./guilds/guilds.module";
import { DiscordModule } from "./discord/discord.module";
import { AuctionsModule } from "./auctions/auctions.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { CronModule } from "./cron/cron.module";
import { NewsModule } from "./news/news.module";
import { FriendsModule } from "./friends/friends.module";

import { AuthGuard, UserThrottlerGuard, PermissionGuard } from "./core/guard";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: "../.env" }),
        ThrottlerModule.forRoot({
            throttlers: [
                { name: "global", ttl: seconds(60), limit: 300 },
                { name: "global-short", ttl: seconds(10), limit: 50 },
                { name: "global-long", ttl: seconds(300), limit: 800 }
            ]
        }),
        ScheduleModule.forRoot(),

        MailerModule.forRoot({
            transport: {
                host: process.env.SERVER_MAIL_HOST,
                port: Number(process.env.SERVER_MAIL_PORT),
                secure: false,
                auth: {
                    user: process.env.SERVER_MAIL_USER,
                    pass: process.env.SERVER_MAIL_PASSWORD
                }
            },
            defaults: {
                from: process.env.SERVER_MAIL_FROM
            }
        }),

        StripeModule.forRoot(),

        CoreModule,
        LoggerModule,
        PrismaModule,
        RedisModule,
        SocketModule,
        S3Module,
        DefaultModule,
        DataModule,
        AuthModule,
        PermissionsModule,
        UsersModule,
        ChatModule,
        QuestsModule,
        BlooksModule,
        MarketModule,
        SettingsModule,
        CosmeticsModule,
        DiscordModule,
        AuctionsModule,
        LeaderboardModule,
        GuildsModule,
        AuctionsModule,
        CronModule,
        NewsModule,
        FriendsModule
    ],
    controllers: [],
    providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: APP_GUARD, useClass: PermissionGuard }
    ]
})
export class AppModule { }
