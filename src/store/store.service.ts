import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Client } from "square";
import { Conflict, NotFound, StoreCreatePaymentMethodDto, UserPaymentMethod } from "blacket-types";
import { CoreService } from "src/core/core.service";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { Repository } from "sequelize-typescript";

@Injectable()
export class StoreService {
    private userPaymentMethodRepo: Repository<UserPaymentMethod>;

    constructor(
        private client: Client,
        private coreService: CoreService,
        private sequelizeService: SequelizeService
    ) {
        this.userPaymentMethodRepo = this.sequelizeService.getRepository(UserPaymentMethod);
    }

    async createPaymentMethod(userId: string, dto: StoreCreatePaymentMethodDto): Promise<UserPaymentMethod> {
        const customer = await this.client.customersApi.createCustomer({
            givenName: dto.firstName,
            familyName: dto.lastName,
            referenceId: userId
        });

        const card = await this.client.customersApi.createCustomerCard(customer.result.customer.id, {
            cardNonce: dto.cardNonce
        });

        const alreadyExists = await this.userPaymentMethodRepo.count({ where: { userId, lastFour: card.result.card.last4 } });
        if (alreadyExists > 0) {
            await this.client.customersApi.deleteCustomerCard(customer.result.customer.id, card.result.card.id);
            await this.client.customersApi.deleteCustomer(customer.result.customer.id);

            throw new ConflictException(Conflict.STORE_PAYMENT_METHOD_ALREADY_EXISTS);
        }

        await this.userPaymentMethodRepo.update({ primary: false }, { where: { userId } });
        return this.userPaymentMethodRepo.create({
            userId,
            squareCustomerId: customer.result.customer.id,
            squarePaymentMethodId: card.result.card.id,
            lastFour: card.result.card.last4,
            cardBrand: card.result.card.cardBrand,
            primary: true
        });
    }

    async selectPaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await this.userPaymentMethodRepo.findOne({ where: { userId, id: paymentMethodId } });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        const transaction = await this.sequelizeService.transaction();

        await this.userPaymentMethodRepo.update({ primary: false }, { where: { userId }, transaction });
        await this.userPaymentMethodRepo.update({ primary: true }, { where: { userId, id: paymentMethodId }, transaction });

        await transaction.commit();
    }

    async removePaymentMethod(userId: string, paymentMethodId: string) {
        const paymentMethod = await this.userPaymentMethodRepo.findOne({ where: { userId, id: paymentMethodId } });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        await this.client.customersApi.deleteCustomerCard(paymentMethod.squareCustomerId, paymentMethod.squarePaymentMethodId);

        const transaction = await this.sequelizeService.transaction();

        await this.userPaymentMethodRepo.destroy({ where: { userId, id: paymentMethodId }, transaction });
        await this.userPaymentMethodRepo.update({ primary: true }, { where: { userId }, limit: 1, transaction });

        await transaction.commit();
    }

    /* async createPayment(userId: string) {
        const paymentMethod = await this.userPaymentMethodRepo.findOne({ where: { userId } });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        const payment = await this.client.paymentsApi.createPayment({
            idempotencyKey: crypto.randomUUID(),
            customerId: paymentMethod.squareCustomerId,
            sourceId: paymentMethod.squarePaymentMethodId,
            amountMoney: {
                amount: BigInt(999),
                currency: "USD"
            },
            note: JSON.stringify({
                product: "Blooks",
                quantity: 1
            })
        });

        return this.coreService.serializeBigInt(payment.result.payment);
    } */
}