import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import Stripe from "stripe";
import { Conflict, NotFound, StripeCreatePaymentMethodDto, StripeCreateSetupIntentDto } from "@blacket/types";
import { BlookObtainMethod } from "@blacket/core";

@Injectable()
export class StripeService {
    public readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
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
            case "payment_intent.succeeded":
                this.handlePaymentIntent(event.data.object as Stripe.PaymentIntent);

                break;
        }
    }

    async handlePaymentIntent(event: Stripe.PaymentIntent) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.productId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        if (product.blookId) await this.prismaService.userBlook.create({
            data: {
                userId: user.id,
                blookId: product.blookId,
                initalObtainerId: user.id,
                obtainedBy: BlookObtainMethod.UNKNOWN
            }
        });

        if (product.itemId) await this.prismaService.userItem.create({
            data: {
                userId: user.id,
                itemId: product.itemId,
                initalObtainerId: user.id
            }
        });

        if (product.fontId) await this.prismaService.userFont.create({
            data: {
                userId: user.id,
                fontId: product.fontId
            }
        });

        if (product.titleId) await this.prismaService.userTitle.create({
            data: {
                userId: user.id,
                titleId: product.titleId
            }
        });

        if (product.bannerId) await this.prismaService.userBanner.create({
            data: {
                userId: user.id,
                bannerId: product.bannerId
            }
        });

        if (product.groupId) await this.prismaService.userGroup.create({
            data: {
                userId: user.id,
                groupId: product.groupId
            }
        });

        console.log(`User ${user.username} has successfully purchased product ${product.name}.`);
    }

    async createSetupIntent(userId: string, dto: StripeCreateSetupIntentDto) {
        const user = await this.prismaService.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await this.stripe.customers.create({
                name: user.username,
                metadata: {
                    userId
                }
            });
            if (!customer) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

            await this.prismaService.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });

            customerId = customer.id;
        }

        const paymentMethod = await this.stripe.paymentMethods.retrieve(dto.paymentMethodId);
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (paymentMethod.customer) throw new ConflictException(Conflict.PAYMENT_METHOD_ALREADY_EXISTS);

        const setupIntent = await this.stripe.setupIntents.create({
            payment_method: dto.paymentMethodId,
            customer: customerId,
            usage: "off_session"
        });
        if (!setupIntent) throw new NotFoundException(NotFound.UNKNOWN_SETUP_INTENT);

        return {
            id: setupIntent.id,
            clientSecret: setupIntent.client_secret
        };
    }

    async createPaymentMethod(userId: string, dto: StripeCreatePaymentMethodDto) {
        const setupIntent = await this.stripe.setupIntents.retrieve(dto.setupIntentId);
        if (!setupIntent) throw new NotFoundException(NotFound.UNKNOWN_SETUP_INTENT);

        if (setupIntent.status !== "succeeded") throw new ForbiddenException();

        const paymentMethod = await this.stripe.paymentMethods.retrieve(setupIntent.payment_method.toString());
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        const alreadyExists = await this.prismaService.userPaymentMethod.count({
            where: {
                userId,
                paymentMethodId: paymentMethod.id
            }
        });
        if (alreadyExists > 0) throw new ConflictException(Conflict.PAYMENT_METHOD_ALREADY_EXISTS);

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
        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { id } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);
        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        return await this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.updateMany({ data: { primary: false }, where: { userId } });
            await tx.userPaymentMethod.update({ where: { userId, id: paymentMethod.id }, data: { primary: true } });
        });
    }

    async removePaymentMethod(userId: string, id: number) {
        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { id } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        await this.stripe.paymentMethods.detach(paymentMethod.paymentMethodId);

        this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.delete({ where: { userId, id: paymentMethod.id } });

            const firstPaymentMethod = await tx.userPaymentMethod.findFirst({ orderBy: { createdAt: "desc" }, where: { userId } });
            if (firstPaymentMethod) await tx.userPaymentMethod.update({ where: { id: firstPaymentMethod.id }, data: { primary: true } });
        });
    }

    async createPaymentIntent(userId: string, productId: number) {
        const product = await this.redisService.getProduct(productId);
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const FINAL_PRICE = Math.round(product.price * 100);
        const STATEMENT_DESCRIPTOR = product.name.toUpperCase().replaceAll(" ", "").substring(0, 22);

        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { primary: true } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: FINAL_PRICE,
            currency: "usd",

            customer: user.stripeCustomerId,
            payment_method: paymentMethod.paymentMethodId,

            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never"
            },

            statement_descriptor_suffix: STATEMENT_DESCRIPTOR,
            description: product.description,

            metadata: {
                productId
            }
        });

        return paymentIntent;
    }
}
