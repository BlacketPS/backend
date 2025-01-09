import { BadRequestException, Body, Controller, Delete, Headers, HttpCode, HttpStatus, Param, Post, Get, Put, Request } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { GetCurrentUser, Public } from "src/core/decorator";
import { hours, seconds, Throttle } from "@nestjs/throttler";
import { StripeCreatePaymentMethodDto, StripeCreatePaymentMethodEntity, StripeCreateSetupIntentDto, StripeCreateSetupIntentEntity } from "@blacket/types";

@Controller("stripe")
export class StripeController {
    constructor(
        private stripeService: StripeService
    ) { }

    @Public()
    @Post("webhook")
    async webhook(
        @Headers("stripe-signature") signature: string,
        @Request() request
    ) {
        if (!signature) throw new BadRequestException();

        const body = request.body;
        if (!body) throw new BadRequestException();

        const event = await this.stripeService.constructWebhookEvent(body, signature);
        if (!event) throw new BadRequestException();

        return this.stripeService.handleWebhook(event);
    }

    @Get("products")
    async getProducts() {
        return this.stripeService.getProducts();
    }

    @Throttle({ default: { limit: 20, ttl: hours(1) } })
    @Post("setup-intent")
    async createSetupIntent(@GetCurrentUser() userId: string, @Body() dto: StripeCreateSetupIntentDto) {
        const setupIntent = await this.stripeService.createSetupIntent(userId, dto);

        return new StripeCreateSetupIntentEntity(setupIntent);
    }

    @Throttle({ default: { limit: 5, ttl: hours(1) } })
    @Post("payment-methods")
    async createPaymentMethod(@GetCurrentUser() userId: string, @Body() dto: StripeCreatePaymentMethodDto) {
        const paymentMethod = (await this.stripeService.createPaymentMethod(userId, dto));

        return new StripeCreatePaymentMethodEntity(paymentMethod);
    }

    @Throttle({ default: { limit: 10, ttl: seconds(60) } })
    @Put("payment-methods/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    selectPaymentMethod(@GetCurrentUser() userId: string, @Param("id") id: string) {
        return this.stripeService.selectPaymentMethod(userId, parseInt(id));
    }

    @Throttle({ default: { limit: 10, ttl: seconds(60) } })
    @Delete("payment-methods/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    removePaymentMethod(@GetCurrentUser() userId: string, @Param("id") id: string) {
        return this.stripeService.removePaymentMethod(userId, parseInt(id));
    }

    @Throttle({ default: { limit: 60, ttl: hours(1) } })
    @Post("payment-intent/:productId")
    async createPaymentIntent(@GetCurrentUser() userId: string, @Param("productId") id: string) {
        return this.stripeService.createPaymentIntent(userId, parseInt(id));
    }
}
