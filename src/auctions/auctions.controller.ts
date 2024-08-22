import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuctionsService } from "./auctions.service";
import { GetCurrentUser } from "src/core/decorator";
import { AuctionsAuctionEntity, AuctionsCreateAuctionDto } from "blacket-types";

@ApiTags("auctions")
@Controller("auctions")
export class AuctionsController {
    constructor(
        private auctionsService: AuctionsService
    ) { }

    @Get("")
    async getAuctions() {
        const auctions = await this.auctionsService.getAuctions();

        return auctions.map((auction) => new AuctionsAuctionEntity(auction));
    }

    @Post("")
    createAuction(@GetCurrentUser() userId: string, @Body() dto: AuctionsCreateAuctionDto) {
        return this.auctionsService.createAuction(userId, dto);
    }
}
