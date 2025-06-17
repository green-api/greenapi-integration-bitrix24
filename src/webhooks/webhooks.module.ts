import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { Bitrix24Module } from "../bitrix24/bitrix24.module";

@Module({
	controllers: [WebhooksController],
	imports: [Bitrix24Module],
})
export class WebhooksModule {}
