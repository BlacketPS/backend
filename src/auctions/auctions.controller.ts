import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CoreService } from "src/core/core.service";
import { AuctionsService } from "./auctions.service";
import { GetCurrentUser } from "src/core/decorator";
import { AuctionsAuctionEntity, AuctionsCreateAuctionDto, AuctionsSearchAuctionDto } from "@blacket/types";

@ApiTags("auctions")
@Controller("auctions")
export class AuctionsController {
    constructor(
        private coreService: CoreService,
        private auctionsService: AuctionsService
    ) { }

    @Get(":filters")
    async getAuctions(@Param("filters") dto: AuctionsSearchAuctionDto | string) {
        const auctions = await this.auctionsService.getAuctions(this.coreService.safelyParseJSON(dto as string));

        return auctions.map((auction) => new AuctionsAuctionEntity(auction));
    }

    @Post("")
    createAuction(@GetCurrentUser() userId: string, @Body() dto: AuctionsCreateAuctionDto) {
        return this.auctionsService.createAuction(userId, dto);
    }

    @Put(":id/bin")
    buyItNow(@GetCurrentUser() userId: string, @Param("id") id: number) {
        return this.auctionsService.buyItNow(userId, parseInt(id as unknown as string));
    }
}
