import { Module } from "@nestjs/common";
import { MarketService } from "./market.service";
import { MarketController } from "./market.controller";

@Module({
  controllers: [MarketController],
  providers: [MarketService]
})
export class MarketModule { }
