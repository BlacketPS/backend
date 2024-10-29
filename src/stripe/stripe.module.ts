import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeService } from "./stripe.service";
import { StripeController } from "./stripe.controller";

@Module({
    controllers: [StripeController],
    providers: [StripeService],
    exports: [StripeService],
    imports: [ConfigModule]
})

export class StripeModule {
    static forRoot() {
        return {
            module: StripeModule,
            providers: [
                {
                    provide: "STRIPE_OPTIONS",
                    useFactory: () => ({
                        apiKey: process.env.SERVER_STRIPE_SECRET_KEY,
                        options: {}
                    })
                }
            ],
            exports: [StripeService]
        };
    }
}
