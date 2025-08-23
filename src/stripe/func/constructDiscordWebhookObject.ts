import { StripeProductEntity } from "@blacket/types";
import { Prisma, Transaction } from "@blacket/core";
import Stripe from "stripe";

export const constructDiscordWebhookObject = (
    user: Prisma.UserGetPayload<{
        include: {
            ipAddress: true;
        };
    }>,
    product: StripeProductEntity,
    intent: Stripe.PaymentIntent,
    customer: Stripe.Customer,
    transaction: Transaction,
    mediaPath: string
) => {
    return {
        content: "<@260453209892454404>",
        embeds: [
            {
                title: "✅ Purchase Successful",
                fields: [
                    {
                        name: "__``User Information``__",
                        value: "**ID:** " + user.id + "\n" +
                            "**Username:** " + user.username + "\n" +
                            "**IP:** " + user.ipAddress.ipAddress + "\n" +
                            "**Email:** " + (user.email || "None") + "\n",
                        inline: true
                    },
                    {
                        name: "__``Product Information``__",
                        value: "**ID:** " + product.id + "\n" +
                            "**Name:** " + product.name + "\n",
                        inline: true
                    }
                ],
                color: 0x00ff00,
                thumbnail: {
                    url: `${mediaPath}/content/icons/success.png`
                },
                image: {
                    url: `${mediaPath}/content/test.png`
                }
            },
            {
                fields: [
                    {
                        name: "__``Payment Information``__",
                        value: "**Stripe ID:** " + intent.id + "\n" +
                            "**Transaction ID:** " + transaction.id + "\n" +
                            "**Amount:** $" + (intent.amount / 100).toFixed(2) + "\n" +
                            "**Quantity:** " + intent.metadata.quantity + "\n",
                        inline: true
                    },
                    {
                        name: "__``Customer Information``__",
                        value: "**Stripe ID:** " + customer.id + "\n" +
                            "**Name:** " + (customer as Stripe.Customer).name + "\n" +
                            "**Email:** " + (customer as Stripe.Customer).email + "\n",
                        inline: true
                    }
                ],
                image: {
                    url: `${mediaPath}/content/test.png`
                },
                color: 0x00ff00,
                footer: {
                    text: `Created At: ${new Date(intent.created * 1000).toLocaleString()}`
                }
            }
        ]
    };
};
