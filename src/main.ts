import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

import { BlacketLoggerService } from "./core/logger/logger.service";
import { ValidationPipe } from "@nestjs/common";
import { useContainer } from "class-validator";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: new BlacketLoggerService() });

    const configService = app.get(ConfigService);

    app.enableCors({
        origin: [
            // to config, put your own domain here include http[s]://
            "https://dev.blacket.org",
            "https://admin-dev.blacket.org",
            "https://blacket.org"
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
