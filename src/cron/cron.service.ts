import { AuctionType } from "@blacket/core";
import { SocketAuctionExpireEntity } from "@blacket/types";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BlacketLoggerService } from "src/core/logger/logger.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SocketService } from "src/socket/socket.service";

@Injectable()
export class CronService {
    constructor(
        private loggerService: BlacketLoggerService,
        private prismaService: PrismaService,
        private socketService: SocketService
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
                .filter((bid) => bid && bid.user && bid.user.tokens >= bid.amount)
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

                await tx.user.update({ where: { id: auction.seller.id }, data: { tokens: { increment: auction.bids[0].amount } } });
                await tx.user.update({ where: { id: auction.bids[0].user.id }, data: { tokens: { decrement: auction.bids[0].amount } } });

                switch (auction.type) {
                    case AuctionType.BLOOK:
                        await tx.userBlook.update({ where: { id: auction.blook.id }, data: { userId: auction.bids[0].user.id } });
                        break;
                    case AuctionType.ITEM:
                        await tx.userItem.update({ where: { id: auction.item.id }, data: { userId: auction.bids[0].user.id } });
                        break;
                }

                await tx.auction.update({ where: { id: auction.id }, data: { buyerId: auction.bids[0].user.id, delistedAt: new Date() } });

                this.socketService.emitAuctionExpireEvent(new SocketAuctionExpireEntity({
                    id: auction.id,
                    type: auction.type,
                    blookId: auction.blookId,
                    item: auction.item,
                    sellerId: auction.sellerId,
                    buyerId: auction.bids[0].user.id,
                    price: auction.bids[0].amount,
                    buyItNow: auction.buyItNow
                }));
            }
        });

        this.loggerService.verbose(`Delisted ${expiredAuctions.length} expired auctions in ${Date.now() - startTime}ms.`, "CronService");
    }

    @Cron("*/10 * * * * *", { name: "updateLastSeen", timeZone: "UTC" })
    updateLastSeen() {
        const users = this.socketService.getAllConnectedUsers();
        if (users.length < 1) return;

        this.prismaService.user.updateMany({ where: { id: { in: users } }, data: { lastSeen: new Date(Date.now()) } });
    }

    @Cron("0 0 * * * *", { name: "deleteOldForms", timeZone: "UTC" })
    async deleteOldForms() {
        const forms = await this.prismaService.form.findMany({ where: { createdAt: { lte: new Date(Date.now() - 604800000) } } });
        if (forms.length < 1) return;

        const startTime = Date.now();

        this.loggerService.verbose(`Deleting ${forms.length} old forms...`, "CronService");

        await this.prismaService.form.deleteMany({ where: { id: { in: forms.map((form) => form.id) } } });

        this.loggerService.verbose(`Deleted ${forms.length} old forms in ${Date.now() - startTime}ms.`, "CronService");
    }
}
