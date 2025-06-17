import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { Settings } from "@green-api/greenapi-integration";
import helmet from "helmet";

declare global {
	namespace PrismaJson {
		// noinspection JSUnusedGlobalSymbols
		type InstanceSettings = Settings;
	}
}

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {});
	app.useGlobalPipes(new ValidationPipe());
	app.use(helmet());
	app.enableCors();

	await app.listen(3000);
}

void bootstrap();