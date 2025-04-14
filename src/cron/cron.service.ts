import { AuctionType } from "@blacket/core";
import { AuctionsBidEntity, SocketAuctionExpireEntity } from "@blacket/types";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { BlacketLoggerService } from "src/core/logger/logger.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SocketService } from "src/socket/socket.service";

@Injectable()
export class CronService {
    constructor(
        private loggerService: BlacketLoggerService,
        private prismaService: PrismaService,
        private socketService: SocketService,
        private configService: ConfigService
    ) { }

    @Cron("0 * * * * *", { name: "checkAuctions", timeZone: "UTC" })
    async checkAuctions() {
        const expiredAuctions = await this.prismaService.auction.findMany({
            where: {
                expiresAt: { lte: new Date() },
                buyerId: null,
                delistedAt: null
            },
            include: {
                blook: true,
                item: true,
                seller: true,
                bids: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (expiredAuctions.length < 1) return;

        for (const auction of expiredAuctions) {
            if (auction.buyItNow) continue;

            auction.bids = auction.bids
                .sort((a, b) => b.amount - a.amount);
        }

        const startTime = Date.now();
        this.loggerService.verbose(`Delisting ${expiredAuctions.length} expired auctions...`, "CronService");

        await this.prismaService.$transaction(async (tx) => {
            for (const auction of expiredAuctions) {
                if (auction.buyItNow) {
                    await tx.auction.update({ where: { id: auction.id }, data: { delistedAt: new Date() } });

                    continue;
                }

                if (auction.bids.length < 1) {
                    await tx.auction.update({ where: { id: auction.id }, data: { delistedAt: new Date() } });

                    continue;
                }

                const winningBid = auction.bids[0];

                await tx.user.update({ where: { id: auction.seller.id }, data: { tokens: { increment: winningBid.amount } } });

                switch (auction.type) {
                    case AuctionType.BLOOK:
                        await tx.userBlook.update({ where: { id: auction.blook.id }, data: { userId: winningBid.user.id } });
                        break;
                    case AuctionType.ITEM:
                        await tx.userItem.update({ where: { id: auction.item.id }, data: { userId: winningBid.user.id } });
                        break;
                }

                await tx.auction.update({ where: { id: auction.id }, data: { buyerId: winningBid.user.id, delistedAt: new Date() } });

                const losingBidders = auction.bids.reduce((acc, bid) => {
                    if (!acc[bid.user.id] || acc[bid.user.id].amount < bid.amount) {
                        acc[bid.user.id] = bid;
                    }

                    return acc;
                }, {}) as Record<string, AuctionsBidEntity>;

                for (const bid of Object.values(losingBidders)) {
                    if (bid.user.id === winningBid.user.id) continue;

                    await tx.user.update({
                        where: { id: bid.user.id },
                        data: { tokens: { increment: bid.amount } }
                    });
                }

                this.socketService.emitAuctionExpireEvent(new SocketAuctionExpireEntity({
                    id: auction.id,
                    type: auction.type,
                    blook: auction.blook,
                    item: auction.item,
                    sellerId: auction.sellerId,
                    buyerId: winningBid.user.id,
                    price: winningBid.amount,
                    buyItNow: auction.buyItNow
                }));
            }
        });

        this.loggerService.verbose(`Delisted ${expiredAuctions.length} expired auctions in ${Date.now() - startTime}ms.`, "CronService");
    }

    @Cron("*/10 * * * * *", { name: "updateLastSeen", timeZone: "UTC" })
    async updateLastSeen() {
        const users = this.socketService.getAllConnectedUsers();
        if (users.length < 1) return;

        const newLastSeen = new Date(Date.now());

        await this.prismaService.user.updateMany({ where: { id: { in: users } }, data: { lastSeen: newLastSeen } });
    }
}
