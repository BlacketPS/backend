import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StoreService } from "./store.service";
import { GetCurrentUser } from "src/core/decorator";
import { StoreCreatePaymentMethodEntity, StoreCreatePaymentMethodDto } from "blacket-types";
import { Throttle, hours, seconds } from "@nestjs/throttler";

@ApiTags("leaderboard")
@Controller("store")
export class StoreController {
    constructor(
        private storeService: StoreService
    ) { }

    @Throttle({ default: { limit: 20, ttl: hours(1) } })
    @Post("payment-methods/create")
    async createPaymentMethod(@GetCurrentUser() userId: string, @Body() dto: StoreCreatePaymentMethodDto) {
        const paymentMethod = (await this.storeService.createPaymentMethod(userId, dto));

        return new StoreCreatePaymentMethodEntity(paymentMethod);
    }

    @Throttle({ default: { limit: 10, ttl: seconds(60) } })
    @Put("payment-methods/:paymentMethodId")
    @HttpCode(HttpStatus.NO_CONTENT)
    selectPaymentMethod(@GetCurrentUser() userId: string, @Param("paymentMethodId") paymentMethodId: number) {
        return this.storeService.selectPaymentMethod(userId, paymentMethodId);
    }

    @Throttle({ default: { limit: 20, ttl: hours(1) } })
    @Delete("payment-methods/:paymentMethodId")
    @HttpCode(HttpStatus.NO_CONTENT)
    removePaymentMethod(@GetCurrentUser() userId: string, @Param("paymentMethodId") paymentMethodId: number) {
        return this.storeService.removePaymentMethod(userId, paymentMethodId);
    }
}
