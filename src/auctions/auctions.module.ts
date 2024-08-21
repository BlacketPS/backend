import { Module } from "@nestjs/common";
import { AuctionsService } from "./auctions.service";
import { AuctionsController } from "./auctions.controller";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [UsersModule],
    providers: [AuctionsService],
    controllers: [AuctionsController]
})
export class AuctionsModule { }
