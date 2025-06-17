import { Module } from "@nestjs/common";
import { Bitrix24Module } from "./bitrix24/bitrix24.module";
import { OauthModule } from "./oauth/oauth.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

@Module({
	imports: [ConfigModule.forRoot({
		isGlobal: true, envFilePath: ".env", cache: true,
	}), ServeStaticModule.forRoot({
		rootPath: join(__dirname, "..", "static"),
	}), Bitrix24Module, OauthModule, WebhooksModule, PrismaModule],
	controllers: [AppController],
})
export class AppModule {}
