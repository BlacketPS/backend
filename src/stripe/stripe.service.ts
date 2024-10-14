import { Conflict, NotFound, StripeCreatePaymentMethodDto } from "@blacket/types";
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import Stripe from "stripe";

@Injectable()
export class StripeService {
    public readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly prismaService: PrismaService,
        @Inject("STRIPE_OPTIONS") private readonly options: { apiKey: string, options: Stripe.StripeConfig }
    ) {
        this.stripe = new Stripe(this.options.apiKey, this.options.options);
    }

    async constructWebhookEvent(body: string, signature: string): Promise<Stripe.Event> {
        return this.stripe.webhooks.constructEvent(body, signature, this.configService.get<string>("SERVER_STRIPE_WEBHOOK_SECRET_KEY"));
    }

    async handleWebhook(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            // TODO: handle events
        }
    }

    async createSetupIntent(dto: StripeCreatePaymentMethodDto) {
        const setupIntent = await this.stripe.setupIntents.create({ payment_method: dto.paymentMethodId, usage: "off_session" });
        if (!setupIntent) throw new ForbiddenException();

        return { clientSecret: setupIntent.client_secret };
    }

    async createPaymentMethod(userId: string, dto: StripeCreatePaymentMethodDto) {
        const paymentMethod = await this.stripe.paymentMethods.retrieve(dto.paymentMethodId);

        const alreadyExists = await this.prismaService.userPaymentMethod.count({
            where: {
                userId,
                lastFour: paymentMethod.card.last4,
                cardBrand: paymentMethod.card.brand.toUpperCase()
            }
        });
        if (alreadyExists > 0) throw new ConflictException(Conflict.STRIPE_PAYMENT_METHOD_ALREADY_EXISTS);

        return await this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.updateMany({ data: { primary: false }, where: { userId } });

            return await tx.userPaymentMethod.create({
                data: {
                    userId,
                    paymentMethodId: paymentMethod.id,
                    lastFour: paymentMethod.card.last4,
                    cardBrand: paymentMethod.card.brand.toUpperCase(),
                    primary: true
                }
            });
        });
    }

    async selectPaymentMethod(userId: string, id: number) {
        const paymentMethod = await this.prismaService.userPaymentMethod.findFirst({ where: { userId, id } });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        return await this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.updateMany({ data: { primary: false }, where: { userId } });
            await tx.userPaymentMethod.update({ where: { userId, id: paymentMethod.id }, data: { primary: true } })
        });
    }

    async removePaymentMethod(userId: string, id: number) {
        const paymentMethod = await this.prismaService.userPaymentMethod.findUnique({
            where: { userId, id }
        });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.delete({ where: { userId, id: paymentMethod.id } });

            const firstPaymentMethod = await tx.userPaymentMethod.findFirst({ select: { id: true }, orderBy: { createdAt: "desc" }, where: { userId } });
            if (firstPaymentMethod) await tx.userPaymentMethod.update({ where: { id: firstPaymentMethod.id }, data: { primary: true } });
        });
    }
}