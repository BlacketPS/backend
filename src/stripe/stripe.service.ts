import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SocketService } from "src/socket/socket.service";
import { PermissionsService } from "src/permissions/permissions.service";
import Stripe from "stripe";
import axios from "axios";

import { BadRequest, Conflict, InternalServerError, NotFound, SocketMessageType, StripeCreatePaymentIntentDto, StripeCreatePaymentMethodDto, StripeCreateSetupIntentDto, StripeProductEntity, StripeStoreEntity } from "@blacket/types";
import { BlookObtainMethod, CurrencyType, TransactionStatus, UserSubscription, UserSubscriptionStatus } from "@blacket/core";
import { constructDiscordWebhookObject } from "./func";

@Injectable()
export class StripeService {
    public readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService,
        private readonly socketService: SocketService,
        private readonly permissionsService: PermissionsService,
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
            case "payment_intent.payment_failed":
                // return await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
                // TODO: handle payment intent failure
                return console.log("Payment failed");
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
                products: {
                    select: {
                        id: true
                    }
                }
            }
        });
        if (!stores) throw new InternalServerErrorException(InternalServerError.DEFAULT);

        const response = stores.map((store) => new StripeStoreEntity({
            id: store.id,
            name: store.name,
            description: store.description,
            priority: store.priority,
            products: store.products.map((product) => product.id),
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
            active: store.active
        }));

        await this.redisService.setKey("products", "*", response);

        return response;
    }

    async handlePaymentIntent(event: Stripe.PaymentIntent) {
        const user = await this.prismaService.user.findFirst({
            where: {
                stripeCustomerId: event.customer as string
            },
            include: {
                ipAddress: true
            }
        });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const customer = await this.stripe.customers.retrieve(event.customer as string);
        if (!customer) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const blooks = [];
        const items = [];
        const fonts = [];
        const titles = [];
        const banners = [];
        const permissions = [];

        let tokens = 0;
        let gems = 0;

        let subscription;

        for (let i = 0; i < (parseInt(event.metadata.quantity as string) || 1); i++) {
            if (product.blookId) {
                const shiny = (Math.random() < 0.1) ? true : false;

                const currentCount = await this.prismaService.userBlook.count({ where: { blookId: product.blookId, shiny } });
                const nextSerial = currentCount + 1;

                const blook = await this.prismaService.userBlook.create({
                    data: {
                        userId: user.id,
                        blookId: product.blookId,
                        initialObtainerId: user.id,
                        shiny,
                        serial: nextSerial,
                        obtainedBy: BlookObtainMethod.PURCHASE
                    }
                });

                blooks.push(blook);
            }

            if (product.itemId) {
                const item = await this.prismaService.userItem.create({
                    data: {
                        userId: user.id,
                        itemId: product.itemId,
                        initialObtainerId: user.id
                    }
                });
                items.push(item);
            }

            if (product.fontId) {
                const font = await this.prismaService.userFont.create({
                    data: {
                        userId: user.id,
                        fontId: product.fontId
                    }
                });
                fonts.push(font.id);
            }

            if (product.titleId) {
                const title = await this.prismaService.userTitle.create({
                    data: {
                        userId: user.id,
                        titleId: product.titleId
                    }
                });

                titles.push(title.id);
            }

            if (product.bannerId) {
                const banner = await this.prismaService.userBanner.create({
                    data: {
                        userId: user.id,
                        bannerId: product.bannerId
                    }
                });

                banners.push(banner.id);
            }

            if (product.groupId && !product.isSubscription) {
                const group = await this.prismaService.group.findFirst({ where: { id: product.groupId } });
                if (!group) throw new NotFoundException(NotFound.DEFAULT);

                const existingGroup = await this.prismaService.userGroup.count({
                    where: {
                        userId: user.id,
                        groupId: product.groupId
                    }
                });
                if (existingGroup === 0) await this.prismaService.userGroup.create({
                    data: {
                        userId: user.id,
                        groupId: product.groupId
                    }
                });

                this.permissionsService.clearCache(user.id);

                permissions.push(...group.permissions);
            }

            if (product.isSubscription) await this.prismaService.$transaction(async (tx) => {
                await tx.userSubscription.updateMany({
                    where: {
                        userId: user.id,
                        status: UserSubscriptionStatus.ACTIVE,
                        expiresAt: { equals: null }
                    },
                    data: { status: UserSubscriptionStatus.CANCELED }
                });

                const existingSubscription = await tx.userSubscription.findFirst({
                    where: {
                        userId: user.id,
                        productId: product.id,
                        status: UserSubscriptionStatus.ACTIVE,
                        expiresAt: { gte: new Date() }
                    },
                    orderBy: { expiresAt: "desc" },
                    take: 1
                });
                if (existingSubscription) {
                    const sub = await this.stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId);
                    if (!sub) throw new InternalServerErrorException(InternalServerError.DEFAULT);

                    await this.stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);

                    const invoice = await this.stripe.invoices.retrieve(sub.latest_invoice as string);
                    if (!invoice) throw new InternalServerErrorException(InternalServerError.DEFAULT);

                    const chargeId = invoice.payment_intent as string;
                    if (!chargeId) throw new InternalServerErrorException(InternalServerError.DEFAULT);

                    const currentPeriodEnd = sub.current_period_end;
                    const currentPeriodStart = sub.current_period_start;
                    const now = Math.floor(Date.now() / 1000);

                    const timeUsed = now - currentPeriodStart;
                    const periodLength = currentPeriodEnd - currentPeriodStart;
                    const unusedRatio = (periodLength - timeUsed) / periodLength;

                    let amountToRefund = Math.round(invoice.amount_paid * unusedRatio);

                    if (amountToRefund > invoice.amount_paid) {
                        console.warn(`Refund amount ${amountToRefund} is greater than charge amount ${invoice.amount_paid}. Setting refund amount to charge amount.`);

                        amountToRefund = invoice.amount_paid;
                    }

                    console.log(`Refunding ${amountToRefund} cents for subscription ${existingSubscription.stripeSubscriptionId} for user ${user.username}.`);

                    await this.stripe.refunds.create({
                        payment_intent: chargeId,
                        amount: amountToRefund
                    });

                    console.log(`Refunded ${amountToRefund} cents for subscription ${existingSubscription.stripeSubscriptionId} for user ${user.username}.`);

                    await this.prismaService.$transaction(async (tx) => {
                        const lastTransaction = await tx.transaction.findUnique({ where: { stripePaymentId: chargeId } });
                        if (lastTransaction) await tx.transaction.update({
                            where: { id: lastTransaction.id },
                            data: { status: TransactionStatus.REFUNDED }
                        });

                        const ip = await tx.ipAddress.upsert({
                            where: { ipAddress: event.metadata.ipAddress },
                            create: { ipAddress: event.metadata.ipAddress },
                            update: {}
                        });

                        const sub = await tx.userSubscription.create({
                            data: {
                                userId: user.id,
                                productId: product.id,
                                stripeSubscriptionId: event.id,
                                expiresAt: null,
                                ipAddressId: ip.id
                            }
                        });

                        subscription = sub;
                    });
                } else {
                    await this.prismaService.$transaction(async (tx) => {
                        const ip = await tx.ipAddress.upsert({
                            where: { ipAddress: event.metadata.ipAddress },
                            create: { ipAddress: event.metadata.ipAddress },
                            update: {}
                        });

                        const sub = await tx.userSubscription.create({
                            data: {
                                userId: user.id,
                                productId: product.id,
                                stripeSubscriptionId: event.id,
                                expiresAt: null,
                                ipAddressId: ip.id
                            }
                        });

                        subscription = sub;
                    });
                }
            });

            if (product.tokens !== 0 || product.gems !== 0) {
                await this.prismaService.user.update({
                    where: { id: user.id },
                    data: {
                        tokens: { increment: product.tokens || 0 },
                        gems: { increment: product.gems || 0 }
                    }
                });

                tokens += product.tokens || 0;
                gems += product.gems || 0;
            }
        }

        const trans = await this.prismaService.transaction.update({
            where: { id: event.metadata.blacketTransactionId as string },
            data: {
                status: TransactionStatus.COMPLETED,
                stripePaymentId: event.id
            }
        });

        this.socketService.emitToUser(user.id, SocketMessageType.PURCHASE_SUCCEEDED, {
            blooks,
            items,
            fonts,
            titles,
            banners,
            permissions,
            tokens,
            gems,
            subscription
        });

        this.permissionsService.clearCache(user.id);

        const baseUrl = this.configService.get<string>("SERVER_BASE_URL");
        const mediaPath = this.configService.get<string>("VITE_MEDIA_PATH");

        const webhookData = constructDiscordWebhookObject(user, product, event, customer as Stripe.Customer, trans, `${baseUrl}${mediaPath}`);
        console.log(webhookData);

        await axios.post(this.configService.get<string>("SERVER_DISCORD_PURCHASE_WEBHOOK_URL"), webhookData, {
            headers: {
                "Content-Type": "application/json"
            }
        }).catch((err) => {
            // console.error("Error sending webhook:", err);
        });
        console.log(`User ${user.username} has successfully purchased product ${product.name}.`);
    }

    async handleSubscriptionCreate(event: Stripe.Subscription) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const invoice = await this.stripe.invoices.retrieve(event.latest_invoice as string);
        if (!invoice) throw new NotFoundException(NotFound.UNKNOWN_INVOICE);

        const chargeId = invoice.payment_intent as string;
        if (!chargeId) throw new NotFoundException(NotFound.UNKNOWN_TRANSACTION);

        return await this.prismaService.$transaction(async (tx) => {
            const ip = await this.prismaService.ipAddress.upsert({
                where: { ipAddress: event.metadata.ipAddress },
                create: { ipAddress: event.metadata.ipAddress },
                update: {}
            });

            const sub = await tx.userSubscription.create({
                data: {
                    userId: user.id,
                    productId: product.id,
                    stripeSubscriptionId: event.id,
                    expiresAt: new Date(event.current_period_end * 1000),
                    ipAddressId: ip.id
                }
            });

            await this.prismaService.transaction.update({
                where: { id: event.metadata.blacketTransactionId as string },
                data: {
                    status: TransactionStatus.COMPLETED,
                    stripePaymentId: chargeId
                }
            });

            const permissions = await this.prismaService.group.findFirst({
                where: { id: product.groupId },
                select: { permissions: true }
            });

            this.socketService.emitToUser(user.id, SocketMessageType.PURCHASE_SUCCEEDED, {
                permissions: permissions?.permissions,
                subscription: sub
            });

            this.permissionsService.clearCache(user.id);

            console.log(`User ${user.username} has successfully purchased subscription ${product.name}.`);
        });
    };

    async handleInvoiceSuccess(event: Stripe.Invoice) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.subscription_details.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const chargeId = event.payment_intent as string;
        if (!chargeId) throw new NotFoundException(NotFound.UNKNOWN_TRANSACTION);

        return await this.prismaService.$transaction(async (tx) => {
            const ip = await tx.ipAddress.upsert({
                where: { ipAddress: event.subscription_details.metadata.ipAddress },
                create: { ipAddress: event.subscription_details.metadata.ipAddress },
                update: {}
            });

            const subscription = await tx.userSubscription.findFirst({
                where: {
                    userId: user.id,
                    productId: product.id
                }
            });
            if (!subscription) throw new NotFoundException(NotFound.UNKNOWN_SUBSCRIPTION);

            await tx.userSubscription.update({
                where: { id: subscription.id },
                data: {
                    expiresAt: new Date(event.lines.data[0].period.end * 1000)
                }
            });

            await tx.transaction.create({
                data: {
                    user: { connect: { id: user.id } },
                    product: { connect: { id: product.id } },
                    paymentMethod: { connect: { id: parseInt(event.subscription_details.metadata.blacketPaymentMethodId as string) } },
                    amount: parseInt(event.amount_paid as unknown as string) / 100,
                    quantity: parseInt(event.subscription_details.metadata.quantity as string) || 1,
                    currency: CurrencyType.USD,
                    ipAddress: { connect: { id: ip.id } },
                    status: TransactionStatus.COMPLETED,
                    stripePaymentId: chargeId
                }
            });

            this.permissionsService.clearCache(user.id);

            console.log(`User ${user.username} has successfully paid for subscription ${product.name}.`);
        });
    }

    async handleInvoiceFailed(event: Stripe.Invoice) {
        const user = await this.prismaService.user.findFirst({ where: { stripeCustomerId: event.customer as string } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const product = await this.redisService.getProduct(parseInt(event.subscription_details.metadata.blacketProductId as string));
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const chargeId = event.payment_intent as string;
        if (!chargeId) throw new NotFoundException(NotFound.UNKNOWN_TRANSACTION);

        return await this.prismaService.$transaction(async (tx) => {
            const ip = await tx.ipAddress.upsert({
                where: { ipAddress: event.subscription_details.metadata.ipAddress },
                create: { ipAddress: event.subscription_details.metadata.ipAddress },
                update: {}
            });

            const subscription = await tx.userSubscription.findFirst({
                where: {
                    userId: user.id,
                    stripeSubscriptionId: event.subscription as string
                }
            });
            if (!subscription) throw new NotFoundException(NotFound.UNKNOWN_SUBSCRIPTION);

            await tx.transaction.create({
                data: {
                    user: { connect: { id: user.id } },
                    product: { connect: { id: product.id } },
                    paymentMethod: { connect: { id: parseInt(event.subscription_details.metadata.blacketPaymentMethodId as string) } },
                    amount: parseInt(event.amount_due as unknown as string) / 100,
                    quantity: parseInt(event.subscription_details.metadata.quantity as string) || 1,
                    currency: CurrencyType.USD,
                    ipAddress: { connect: { id: ip.id } },
                    status: TransactionStatus.FAILED,
                    stripePaymentId: chargeId
                }
            });

            this.permissionsService.clearCache(user.id);

            console.log(`User ${user.username} has failed to pay for subscription ${product.name}.`);
        });
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

        await this.prismaService.userSubscription.update({
            where: { id: subscription.id },
            data: {
                status: UserSubscriptionStatus.CANCELED,
                expiresAt: new Date(event.current_period_end * 1000)
            }
        });

        this.permissionsService.clearCache(user.id);

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
                paymentMethodId: paymentMethod.id,
                deletedAt: null
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
        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { id, deletedAt: null } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);
        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const customer = await this.stripe.customers.retrieve(user.stripeCustomerId);
        if (!customer) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const subscription = await this.stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: "active",
            limit: 1
        });

        return await this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.updateMany({ data: { primary: false }, where: { userId } });
            await tx.userPaymentMethod.update({ where: { userId, id: paymentMethod.id }, data: { primary: true } });

            if (subscription.data.length > 0) await this.stripe.subscriptions.update(subscription.data[0].id, {
                default_payment_method: paymentMethod.paymentMethodId,
                metadata: {
                    blacketPaymentMethodId: paymentMethod.id
                }
            });
        });
    }

    async removePaymentMethod(userId: string, id: number) {
        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { id, deletedAt: null } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const subscription = await this.stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: "active",
            limit: 1
        });
        if (subscription.data.length > 0 && subscription.data[0].default_payment_method === paymentMethod.paymentMethodId) throw new ConflictException(Conflict.PAYMENT_METHOD_IN_USE);

        await this.stripe.paymentMethods.detach(paymentMethod.paymentMethodId);

        this.prismaService.$transaction(async (tx) => {
            await tx.userPaymentMethod.update({ where: { userId, id: paymentMethod.id }, data: { deletedAt: new Date() } });

            const firstPaymentMethod = await tx.userPaymentMethod.findFirst({ orderBy: { createdAt: "desc" }, where: { userId } });
            if (firstPaymentMethod) await tx.userPaymentMethod.update({ where: { id: firstPaymentMethod.id }, data: { primary: true } });
        });
    }

    async createPaymentIntent(userId: string, productId: number, dto: StripeCreatePaymentIntentDto, ipAddress: string) {
        const product = await this.redisService.getProduct(productId);
        if (!product) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);
        if (product.isSubscription && product.price === 0) throw new BadRequestException(NotFound.UNKNOWN_PRODUCT);

        let quantity = dto.quantity;
        if (!quantity || quantity <= 0) quantity = 1;

        if (product.isQuantityCapped && quantity > 1) throw new BadRequestException(BadRequest.PRODUCT_QUANTITY_CAPPED);

        const FINAL_PRICE = Math.round((product.price * quantity) * 100);
        const STATEMENT_DESCRIPTOR = product.name.toUpperCase().replaceAll(" ", "").substring(0, 22);

        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: {
                subscriptions: {
                    where: {
                        productId,
                        status: UserSubscriptionStatus.ACTIVE,
                        expiresAt: null
                    }
                }
            }
        });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.subscriptions.length > 0 && product.isSubscription) throw new ConflictException(Conflict.SUBSCRIPTION_ALREADY_EXISTS);

        const paymentMethod = await this.prismaService.userPaymentMethod.findUnique({
            where: {
                id: dto.paymentMethodId,
                userId,
                deletedAt: null
            }
        });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const ip = await this.prismaService.ipAddress.upsert({
            where: { ipAddress },
            create: { ipAddress },
            update: {}
        });

        const transaction = await this.prismaService.transaction.create({
            data: {
                user: { connect: { id: user.id } },
                product: { connect: { id: product.id } },
                paymentMethod: { connect: { id: paymentMethod.id } },
                amount: FINAL_PRICE / 100,
                quantity,
                currency: CurrencyType.USD,
                ipAddress: { connect: { id: ip.id } },
                status: TransactionStatus.PENDING
            }
        });

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: FINAL_PRICE,
            currency: "usd",

            customer: user.stripeCustomerId,
            payment_method: paymentMethod.paymentMethodId,

            confirm: false,

            statement_descriptor_suffix: STATEMENT_DESCRIPTOR,
            description: `x${quantity} ${product.name}${product.stripeProductId ? ` (${product.stripeProductId})` : ""}`,

            metadata: {
                quantity: quantity.toString(),
                blacketProductId: productId,
                blacketUserId: user.id,
                blacketPaymentMethodId: paymentMethod.id,
                blacketTransactionId: transaction.id,
                stripeProductId: product.stripeProductId,
                stripePriceId: product.stripePriceId,
                ipAddress
            }
        });

        return paymentIntent;
    }

    async createSubscription(userId: string, productId: number, ipAddress: string) {
        const hasSubscription = await this.prismaService.userSubscription.count({ where: { userId, productId, status: UserSubscriptionStatus.ACTIVE } });
        if (hasSubscription > 0) throw new ConflictException(Conflict.SUBSCRIPTION_ALREADY_EXISTS);

        const product = await this.redisService.getProduct(productId);
        if (!product || !product.isSubscription) throw new NotFoundException(NotFound.UNKNOWN_PRODUCT);

        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { paymentMethods: { where: { primary: true, deletedAt: null } } } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        const paymentMethod = user.paymentMethods[0];
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        if (!user.stripeCustomerId) throw new NotFoundException(NotFound.UNKNOWN_CUSTOMER);

        const transaction = await this.prismaService.transaction.create({
            data: {
                user: { connect: { id: user.id } },
                product: { connect: { id: product.id } },
                paymentMethod: { connect: { id: paymentMethod.id } },
                amount: product.subscriptionPrice,
                quantity: 1,
                currency: CurrencyType.USD,
                ipAddress: { connect: { ipAddress } },
                status: TransactionStatus.PENDING
            }
        });

        return await this.stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: product.stripePriceId }],
            default_payment_method: paymentMethod.paymentMethodId,

            metadata: {
                quantity: "1",
                blacketProductId: productId,
                blacketUserId: user.id,
                blacketPaymentMethodId: paymentMethod.id,
                blacketTransactionId: transaction.id,
                stripeProductId: product.stripeProductId,
                stripePriceId: product.stripePriceId,
                ipAddress
            },

            cancel_at_period_end: false
        });
    }
}
