import { Controller, Post, Body, HttpCode, HttpStatus, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { Bitrix24Service } from "../bitrix24/bitrix24.service";
import { GreenApiWebhook, GreenApiLogger } from "@green-api/greenapi-integration";
import { Bitrix24WebhookDto } from "../bitrix24/dto/bitrix24-webhook.dto";
import { Bitrix24WebhookGuard } from "./guards/bitrix24-webhook.guard";

@Controller("webhooks")
export class WebhooksController {
	private readonly logger = GreenApiLogger.getInstance(WebhooksController.name);

	constructor(private readonly bitrix24Service: Bitrix24Service) {}

	@Post("green-api")
	@HttpCode(HttpStatus.OK)
	async handleGreenApiWebhook(@Body() webhook: GreenApiWebhook, @Res() res: Response): Promise<void> {
		this.logger.debug(`GREEN-API webhook received: ${webhook.typeWebhook}`);

		res.status(HttpStatus.OK).send();

		try {
			await this.bitrix24Service.handleGreenApiWebhook(webhook, [
				"incomingMessageReceived",
				"stateInstanceChanged",
				"incomingCall",
			]);
		} catch (error: any) {
			this.logger.error(`Error processing GREEN-API webhook:`, error);
		}
	}

	@Post("bitrix24")
	@UseGuards(Bitrix24WebhookGuard)
	async handleBitrix24ConnectorWebhook(@Body() body: Bitrix24WebhookDto, @Res() res: Response): Promise<void> {
		this.logger.debug(`Bitrix24 webhook received`, body);

		try {
			const result = await this.bitrix24Service.processWebhook(body);
			res.json(result);
		} catch (error: any) {
			const errorResponse = this.mapError(error);
			res.status(errorResponse.statusCode).json(errorResponse.body);
		}
	}

	private mapError(error: any) {
		const mappings = [
			{
				pattern: "Missing required parameters",
				status: HttpStatus.BAD_REQUEST,
				message: "Please ensure all required fields are filled correctly.",
			},
			{
				pattern: "Invalid instance ID",
				status: HttpStatus.BAD_REQUEST,
				message: "Instance ID must be 10-12 digits. Please check your GREEN-API console.",
			},
			{
				pattern: "Invalid API token",
				status: HttpStatus.BAD_REQUEST,
				message: "API token seems invalid. Please check your GREEN-API console.",
			},
			{
				pattern: "User not found",
				status: HttpStatus.NOT_FOUND,
				message: "Please reinstall the Bitrix24 app from the Market.",
			},
			{
				pattern: "GREEN-API validation failed",
				status: HttpStatus.BAD_REQUEST,
				message: "Invalid GREEN-API credentials. Please verify your Instance ID and API Token.",
			},
			{pattern: "is already being used by different line", status: HttpStatus.CONFLICT, message: error.message},
			{
				pattern: "Authentication failed",
				status: HttpStatus.UNAUTHORIZED,
				message: "Your Bitrix24 authentication has expired. Please reinstall the app from Bitrix24 Market.",
			},
			{
				pattern: "Token expired",
				status: HttpStatus.UNAUTHORIZED,
				message: "Your Bitrix24 session has expired. Please refresh the page and try again.",
			},
			{
				pattern: "BITRIX24_API_ERROR",
				status: HttpStatus.BAD_GATEWAY,
				message: "Failed to communicate with Bitrix24. Please try again.",
			},
		];

		const match = mappings.find(m => error.message.includes(m.pattern));
		const statusCode = match?.status || HttpStatus.INTERNAL_SERVER_ERROR;
		const message = match?.message || "Configuration failed. Please try again.";

		return {
			statusCode,
			body: {
				success: false,
				message,
				error: match?.pattern || "An unexpected error occurred",
				details: process.env.NODE_ENV === "development" ? {originalMessage: error.message} : undefined,
			},
		};
	}
}