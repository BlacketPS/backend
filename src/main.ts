import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

import { BlacketLoggerService } from "./core/logger/logger.service";
import { ValidationPipe } from "@nestjs/common";
import { useContainer } from "class-validator";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import * as express from "express";
import * as compression from "compression";

const COMPRESS_PATHS = ["/api/users", "/api/data"];

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: new BlacketLoggerService() });

    app.use("/api/stripe/webhook", express.raw({ type: "*/*" }));

    app.use(compression({
        threshold: 100 * 1024,
        filter: (req: any) => COMPRESS_PATHS.some((path) => req.url.startsWith(path))
    }));

    const configService = app.get(ConfigService);

    app.enableCors({
        origin: [
            // to config, put your own domain here include http[s]://
            "https://blacket.org",
            "https://dev.blacket.org",
            "https://beta.blacket.org"
        ],
        credentials: true
    });

    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }));

    app.setGlobalPrefix("/api");

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    const config = new DocumentBuilder()
        .setTitle(configService.get<string>("VITE_INFORMATION_NAME"))
        .setDescription(configService.get<string>("VITE_INFORMATION_DESCRIPTION"))
        .setVersion(configService.get<string>("VITE_INFORMATION_VERSION"))
        .addBearerAuth({
            type: "apiKey",
            name: "Authorization",
            in: "header",
            description: "Auth token, no prefix"
        }, "Authorization")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    await app.listen(configService.get<number>("SERVER_PORT"));
}

bootstrap();
