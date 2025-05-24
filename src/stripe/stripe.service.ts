import { ConflictException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import Stripe from "stripe";
import axios from "axios";

import { Conflict, InternalServerError, NotFound, StripeCreatePaymentMethodDto, StripeCreateSetupIntentDto, StripeProductEntity, StripeStoreEntity } from "@blacket/types";
import { BlookObtainMethod, UserSubscription } from "@blacket/core";
import { constructDiscordWebhookObject } from "./func";

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
                return await this.handlePaymentIntent(event.data.object as Stripe.PaymentIntent);
            case "invoice.payment_succeeded":
                return await this.handleInvoiceSuccess(event.data.object as Stripe.Invoice);
            case "invoice.payment_failed":
                return await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
            case "customer.subscription.created":
                return await this.handleSubscriptionCreate(event.data.object as Stripe.Subscription);
            case "customer.subscription.deleted":
                return await this.handleSubscriptionEnd(event.data.object as Stripe.Subscription);
        }
    }

    async getStores(): Promise<StripeStoreEntity[]> {
        const productCache = await this.redisService.getKey("products", "*");

        // for some reason it returns an object instead of an array, so we need to convert it to an array
        if (productCache) return Object.values(productCache);

        const stores = await this.prismaService.store.findMany({
            where: {
                active: true
            },
            include: {
                products: true
            }
        });
        if (!stores) throw new InternalServerErrorException(InternalServerError.DEFAULT);

        const productCount = await this.prismaService.product.count();

        const stripeProducts = await this.stripe.products.list({ limit: productCount });
        if (!stripeProducts) throw new InternalServerErrorException(InternalServerError.DEFAULT);

        const stripePrices = await this.stripe.prices.list({ limit: productCount });
        if (!stripePrices) throw new InternalServerErrorException(InternalServerError.DEFAULT);

        const response: StripeStoreEntity[] = [];

        for (const store of stores) {
            response.push({ ...store, products: [] });

            for (const product of store.products) {
                const stripeProduct = stripeProducts.data.find((p) => p.id === product.stripeProductId);
                if (!stripeProduct) throw new InternalServerErrorException(InternalServerError.DEFAULT);

                const stripePrice = stripePrices.data.find((p) => p.id === stripeProduct.default_price);
                if (!stripePrice) throw new InternalServerErrorException(InternalServerError.DEFAULT);

                const data = {
                    ...product,

                    name: stripeProduct.name,
                    description: stripeProduct.description,
                    price: stripePrice.unit_amount / 100,

                    stripeProductId: stripeProduct.id,
                    stripePriceId: stripePrice.id
                };

                response[response.length - 1].products.push(data);

                await this.redisService.setProduct(product.id, data);
            }
        }

        await this.redisService.setKey("products", "*", response, 3600);

        return response;
    }

    async handlePaymentIntent(event: Stripe.PaymentIntent) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const customer = await this.stripe.customers.retrieve(event.customer as string);
        if (!customer) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        if (product.blookId) await this.prismaService.userBlook.create({
            data: {
                userId: user.id,
                blookId: product.blookId,
                initialObtainerId: user.id,
                obtainedBy: BlookObtainMethod.PURCHASE
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

        // const baseUrl = this.configService.get<string>("SERVER_BASE_URL");
        // const mediaPath = this.configService.get<string>("VITE_MEDIA_PATH");

        // const webhookData = constructDiscordWebhookObject(user, product, event, customer as Stripe.Customer, `${baseUrl}${mediaPath}`);
        // console.log(webhookData);

        // await axios.post(this.configService.get<string>("SERVER_DISCORD_PURCHASE_WEBHOOK_URL"), webhookData, {
        //     headers: {
        //         "Content-Type": "application/json"
        //     }
        // }).catch((err) => {
        //     // console.error("Error sending webhook:", err);
        // });
        console.log(`User ${user.username} has successfully purchased product ${product.name}.`);
    }

    async handleSubscriptionCreate(event: Stripe.Subscription) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const subscription = await this.prismaService.userSubscription.create({
            data: {
                userId: user.id,
                productId: product.id,
                stripeSubscriptionId: event.id,
                expiresAt: new Date(event.current_period_end * 1000)
            }
        });

        console.log(subscription);

        console.log(`User ${user.username} has successfully purchased subscription ${product.name}.`);
    };

    async handleInvoiceSuccess(event: Stripe.Invoice) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const subscription = await this.prismaService.userSubscription.findFirst({
            where: {
                userId: user.id,
                productId: product.id
            }
        });
        if (!subscription) throw new NotFoundException(NotFound.UNKNOWN_SUBSCRIPTION);

        await this.prismaService.userSubscription.update({
            where: { id: subscription.id },
            data: {
                stripeSubscriptionId: event.subscription as string,
                expiresAt: new Date(event.lines.data[0].period.end * 1000)
            }
        });

        console.log(`User ${user.username} has successfully purchased subscription ${product.name}.`);
    }

    async handleInvoiceFailed(event: Stripe.Invoice) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const subscription = await this.prismaService.userSubscription.findFirst({
            where: {
                userId: user.id,
                stripeSubscriptionId: event.subscription as string
            }
        });
        if (!subscription) throw new NotFoundException(NotFound.UNKNOWN_SUBSCRIPTION);

        console.log(`User ${user.username} has failed to pay for subscription ${product.name}.`);
    }

    async handleSubscriptionEnd(event: Stripe.Subscription) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const subscription = await this.prismaService.userSubscription.findFirst({
            where: {
                userId: user.id,
                stripeSubscriptionId: event.id
            }
        });
        if (!subscription) throw new NotFoundException(NotFound.UNKNOWN_SUBSCRIPTION);

        await this.prismaService.userSubscription.delete({ where: { id: subscription.id } });

        await this.prismaService.userGroup.deleteMany({ where: { userId: user.id, groupId: product.groupId } });

        console.log(`User ${user.username} has successfully ended subscription ${product.name}.`);
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

            confirm: false,

            statement_descriptor_suffix: STATEMENT_DESCRIPTOR,
            description: `${product.name} (${product.stripeProductId})`,

            metadata: {
                blacketProductId: productId,
                stripeProductId: product.stripeProductId,
                stripePriceId: product.stripePriceId
            }
        });

        return paymentIntent;
    }

    async createSubscription(userId: string, productId: number) {
        const hasSubscription = await this.prismaService.userSubscription.count({ where: { userId, productId } });
        if (hasSubscription > 0) throw new ConflictException(Conflict.SUBSCRIPTION_ALREADY_EXISTS);

        const product = await this.redisService.getProduct(productId);
        if (!product || !product.isSubscription) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { primary: true } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        return await this.stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: product.stripePriceId }],
            default_payment_method: paymentMethod.paymentMethodId,

            metadata: {
                blacketProductId: productId,
                stripeProductId: product.stripeProductId,
                stripePriceId: product.stripePriceId
            },

            cancel_at_period_end: false
        });
    }
}
