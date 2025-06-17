import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { GreenApiLogger } from "@green-api/greenapi-integration";
import axios from "axios";

@Injectable()
export class Bitrix24WebhookGuard implements CanActivate {
	private readonly logger = GreenApiLogger.getInstance(Bitrix24WebhookGuard.name);

	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const webhook = request.body;

		this.logger.debug("Validating Bitrix24 webhook", {
			event: webhook?.event,
			domain: webhook?.auth?.domain,
			hasApplicationToken: !!webhook?.auth?.application_token,
		});

		if (webhook?.event === "ONAPPINSTALL") {
			this.logger.debug("Allowing ONAPPINSTALL webhook without validation");
			return true;
		}

		if (webhook?.ACTION) {
			this.logger.debug(`Allowing connector action: ${webhook.ACTION}`);

			if (!webhook?.auth?.domain || !webhook?.auth?.access_token) {
				throw new UnauthorizedException("Missing domain or access_token for connector action");
			}

			const user = await this.prisma.findUser(webhook.auth.domain);
			if (!user) {
				throw new UnauthorizedException(`Unknown portal: ${webhook.auth.domain}`);
			}

			if (user.accessToken !== webhook.auth.access_token) {
				this.logger.info(`Validating new access token for: ${webhook.auth.domain}`);

				const isValidToken = await this.validateBitrix24Token(webhook.auth.domain, webhook.auth.access_token);
				if (!isValidToken) {
					throw new UnauthorizedException("Invalid access token - failed Bitrix24 validation");
				}

				await this.prisma.updateUserTokens(webhook.auth.domain, webhook.auth.access_token, webhook.auth.refresh_token);
			}
			return true;
		}

		if (!webhook || !webhook.event || !webhook.auth || !webhook.auth.domain || !webhook.auth.application_token) {
			this.logger.warn("Invalid Bitrix24 webhook structure", {
				hasWebhook: !!webhook,
				hasEvent: !!webhook?.event,
				hasAuth: !!webhook?.auth,
				hasDomain: !!webhook?.auth?.domain,
				hasApplicationToken: !!webhook?.auth?.application_token,
			});
			throw new UnauthorizedException("Invalid webhook structure");
		}

		const portalDomain = webhook.auth.domain;
		const applicationToken = webhook.auth.application_token;

		const user = await this.prisma.findUser(portalDomain);
		if (!user) {
			this.logger.warn(`Unknown Bitrix24 portal: ${portalDomain}`);
			throw new UnauthorizedException(`Unknown portal: ${portalDomain}. Please reinstall the app.`);
		}

		if (user.applicationToken !== applicationToken) {
			this.logger.warn(`Application token mismatch for portal: ${portalDomain}`, {
				expected: user.applicationToken,
				received: applicationToken,
			});
			throw new UnauthorizedException("Invalid application token");
		}

		this.logger.debug(`Bitrix24 webhook validated for portal: ${portalDomain}`);
		return true;
	}

	private async validateBitrix24Token(domain: string, accessToken: string): Promise<boolean> {
		try {
			const response = await axios.get(`https://${domain}/rest/app.info?auth=${accessToken}`);
			return !response.data.error;
		} catch (error) {
			this.logger.warn(`Token validation failed for ${domain}:`, error.response?.data);
			return false;
		}
	}
}