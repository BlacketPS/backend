import { Module } from "@nestjs/common";
import { MarketService } from "./market.service";
import { MarketController } from "./market.controller";
import { DataModule } from "src/data/data.module";

@Module({
    imports: [DataModule],
    controllers: [MarketController],
    providers: [MarketService]
})
export class MarketModule { }
