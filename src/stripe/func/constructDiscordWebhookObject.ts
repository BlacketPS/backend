import { User } from "@blacket/core";
import { StripeProductEntity } from "@blacket/types";
import Stripe from "stripe";

export const constructDiscordWebhookObject = (
    user: User,
    product: StripeProductEntity,
    intent: Stripe.PaymentIntent,
    customer: Stripe.Customer,
    mediaPath: string
) => {
    return {
        content: "@everyone",
        embeds: [
            {
                title: "✅ Purchase Successful",
                fields: [
                    {
                        name: "__``User Information``__",
                        value: "**Username:** " + user.username + "\n" +
                            "**ID:** " + user.id + "\n" +
                            "**IP:** " + user.ipAddressId + "\n" +
                            "**Email:** " + user.email + "\n",
                        inline: true
                    },
                    {
                        name: "__``Product Information``__",
                        value: "**Name:** " + product.name + "\n" +
                            "**ID:** " + product.id + "\n",
                        inline: true
                    }
                ],
                color: 0x00ff00,
                thumbnail: {
                    url: `${mediaPath}/content/icons/success.png`
                },
                image: {
                    url: "https://i.imgur.com/8NdaHgw.png"
                }
            },
            {
                fields: [
                    {
                        name: "__``Payment Information``__",
                        value: "**ID:** " + intent.id + "\n" +
                            "**Amount:** $" + (intent.amount / 100).toFixed(2) + "\n",
                        inline: true
                    },
                    {
                        name: "__``Customer Information``__",
                        value: "**Name:** " + (customer as Stripe.Customer).name + "\n" +
                            "**ID:** " + customer.id + "\n" +
                            "**Email:** " + (customer as Stripe.Customer).email + "\n",
                        inline: true
                    }
                ],
                image: {
                    url: "https://i.imgur.com/8NdaHgw.png"
                },
                color: 0x00ff00,
                footer: {
                    text: `Created At: ${new Date(intent.created * 1000).toLocaleString()}`
                }
            }
        ]
    };
};
