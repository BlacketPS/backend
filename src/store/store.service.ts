import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Client } from "square";
import { Conflict, NotFound, StoreCreatePaymentMethodDto, UserPaymentMethod } from "@blacket/types";
import { CoreService } from "src/core/core.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class StoreService {
    constructor(
        private client: Client,
        private coreService: CoreService,
        private prismaService: PrismaService
    ) { }

    async createPaymentMethod(userId: string, dto: StoreCreatePaymentMethodDto): Promise<UserPaymentMethod> {
        const customer = await this.client.customersApi.createCustomer({
            givenName: dto.firstName,
            familyName: dto.lastName,
            referenceId: userId
        });

        const card = await this.client.customersApi.createCustomerCard(customer.result.customer.id, {
            cardNonce: dto.cardNonce
        })
            .catch((error) => {
                console.log(error);
                throw new BadRequestException(error.errors[0].detail);
            });

        const alreadyExists = await this.prismaService.userPaymentMethod.count({ where: { userId, lastFour: card.result.card.last4 } });
        if (alreadyExists > 0) {
            await this.client.customersApi.deleteCustomerCard(customer.result.customer.id, card.result.card.id);
            await this.client.customersApi.deleteCustomer(customer.result.customer.id);

            throw new ConflictException(Conflict.STORE_PAYMENT_METHOD_ALREADY_EXISTS);
        }

        await this.prismaService.userPaymentMethod.updateMany({ data: { primary: false }, where: { userId } });
        return this.prismaService.userPaymentMethod.create({
            data: {
                user: { connect: { id: userId } },
                squareCustomerId: customer.result.customer.id,
                squarePaymentMethodId: card.result.card.id,
                lastFour: card.result.card.last4,
                cardBrand: card.result.card.cardBrand,
                primary: true
            }
        });
    }

    async selectPaymentMethod(userId: string, paymentMethodId: number) {
        const paymentMethod = await this.prismaService.userPaymentMethod.findFirst({ where: { userId, id: paymentMethodId } });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        await this.prismaService.$transaction([
            this.prismaService.userPaymentMethod.updateMany({ data: { primary: false }, where: { userId } }),
            this.prismaService.userPaymentMethod.update({ where: { userId, id: paymentMethodId }, data: { primary: true } })
        ]);
    }

    async removePaymentMethod(userId: string, paymentMethodId: number) {
        const paymentMethod = await this.prismaService.userPaymentMethod.findUnique({
            select: { squareCustomerId: true, squarePaymentMethodId: true },
            where: { userId, id: paymentMethodId }
        });
        if (!paymentMethod) throw new NotFoundException(NotFound.UNKNOWN_PAYMENT_METHOD);

        await this.client.customersApi.deleteCustomerCard(paymentMethod.squareCustomerId, paymentMethod.squarePaymentMethodId);

        this.prismaService.$transaction(async (prisma) => {
            await prisma.userPaymentMethod.delete({ where: { userId, id: paymentMethodId } });

            const firstPaymentMethod = await prisma.userPaymentMethod.findFirst({ select: { id: true }, orderBy: { createdAt: "desc" }, where: { userId } });
            if (firstPaymentMethod) await prisma.userPaymentMethod.update({ where: { id: firstPaymentMethod.id }, data: { primary: true } });
        });
    }
}
