import { Module } from "@nestjs/common";
import { OAuthController } from "./oauth.controller";
import { Bitrix24Module } from "../bitrix24/bitrix24.module";

@Module({
	controllers: [OAuthController],
	imports: [Bitrix24Module],
})
export class OauthModule {}
