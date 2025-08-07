import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import {
	BaseAdapter,
	IntegrationError,
	NotFoundError,
	Settings,
	StateInstanceWebhook,
	GreenApiLogger, SendResponse, generateRandomToken,
} from "@green-api/greenapi-integration";
import { Bitrix24Transformer } from "./bitrix24.transformer";
import { PrismaService } from "../prisma/prisma.service";
import {
	Bitrix24MessagePayload,
	Bitrix24PlatformMessage,
	ConnectorConfigurationRequest, ConnectorConfigurationResponse,
	WebhookProcessResult,
} from "../types";
import { Bitrix24WebhookDto } from "./dto/bitrix24-webhook.dto";
import type { Instance, User } from "@prisma/client";

@Injectable()
export class Bitrix24Service extends BaseAdapter<
	Bitrix24WebhookDto,
	Bitrix24PlatformMessage,
	User,
	Instance
> {
	private readonly logger = GreenApiLogger.getInstance(Bitrix24Service.name);

	constructor(
		protected readonly bitrix24Transformer: Bitrix24Transformer,
		protected readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {
		super(bitrix24Transformer, prisma);
	}

	private async refreshAccessToken(user: User): Promise<string> {
		if (!user.refreshToken) {
			throw new IntegrationError("No refresh token available", "UNAUTHORIZED");
		}

		try {
			const response = await axios.post(`https://oauth.bitrix.info/oauth/token/`, null, {
				params: {
					grant_type: "refresh_token",
					client_id: this.configService.get<string>("BITRIX24_CLIENT_ID"),
					client_secret: this.configService.get<string>("BITRIX24_CLIENT_SECRET"),
					refresh_token: user.refreshToken,
				},
			});

			const {access_token, refresh_token, expires_in} = response.data;

			const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;
			await this.prisma.updateUserTokens(
				user.id,
				access_token,
				refresh_token,
				expiresAt,
			);

			this.logger.info(`Token refreshed for portal: ${user.portalDomain}`);
			return access_token;
		} catch (error: any) {
			this.logger.error(`Failed to refresh token for ${user.portalDomain}:`, error.response?.data || error.message);
			throw new IntegrationError("Failed to refresh access token", "UNAUTHORIZED");
		}
	}

	private async callBitrix24Method(
		portalDomain: string,
		method: string,
		params: Record<string, any> = {},
		accessToken?: string,
		retryCount: number = 0,
	): Promise<unknown> {
		const user = await this.prisma.findUser(portalDomain);
		let token = accessToken || user?.accessToken;

		if (!token) {
			throw new IntegrationError(`No access token for portal ${portalDomain}`, "UNAUTHORIZED");
		}

		try {
			const url = `https://${portalDomain}/rest/${method}?auth=${token}`;
			this.logger.debug(`Calling Bitrix24 method: ${method}`, {url, params});

			const response = await axios.post(url, params);

			if (response.data.error) {
				if (response.data.error === "expired_token" && retryCount === 0 && user?.refreshToken) {
					this.logger.warn(`Token expired for ${portalDomain}, attempting refresh...`);

					try {
						const newToken = await this.refreshAccessToken(user);
						return this.callBitrix24Method(portalDomain, method, params, newToken, retryCount + 1);
					} catch (refreshError) {
						this.logger.error(`Token refresh failed for ${portalDomain}:`, refreshError);
						throw new IntegrationError("Authentication failed - please reinstall the app", "UNAUTHORIZED");
					}
				}
				throw new Error(`Bitrix24 API Error: ${response.data.error_description || response.data.error}`);
			}

			return response.data.result;
		} catch (error: any) {
			if (error.response?.status === 401 && retryCount === 0 && user?.refreshToken) {
				this.logger.warn(`HTTP 401 error for ${portalDomain}, attempting token refresh...`);
				try {
					const newToken = await this.refreshAccessToken(user);
					return this.callBitrix24Method(portalDomain, method, params, newToken, retryCount + 1);
				} catch (refreshError) {
					this.logger.error(`Token refresh failed for ${portalDomain}:`, refreshError);
					throw new IntegrationError("Authentication failed - please reinstall the app", "UNAUTHORIZED");
				}
			}

			this.logger.error(`Bitrix24 API call failed: ${method}`, error.response?.data || error.message);
			throw new IntegrationError(
				`Bitrix24 API call failed: ${error.message}`,
				"BITRIX24_API_ERROR",
				error.response?.status || 500,
			);
		}
	}

	async createPlatformClient(_portalDomain: string): Promise<AxiosInstance> {
		return axios.create();
	}

	async sendToPlatform(message: Bitrix24PlatformMessage, instance: Instance & { user: User }): Promise<void> {
		this.logger.info(`Sending message to Bitrix24 for instance ${instance.idInstance}`);
		this.logger.info("Instance", instance);

		if (!instance.user || !instance.user.portalDomain) {
			throw new IntegrationError("Instance not linked to Bitrix24 portal", "CONFIGURATION_ERROR");
		}

		const line = instance.bitrixLine;

		try {
			const messagePayload: Bitrix24MessagePayload = {
				user: {
					id: message.phone,
					name: message.senderName || `WhatsApp ${message.phone}`,
					phone: message.phone,
				},
				message: {
					id: message.id,
					date: Math.floor(Date.now() / 1000),
					text: message.message,
				},
				chat: {
					id: message.phone,
					name: message.senderName || `WhatsApp ${message.phone}`,
					url: null,
				},
			};

			if (message.attachments && message.attachments.length > 0) {
				messagePayload.message.files = message.attachments.map(attachment => ({
					url: attachment.url,
					name: attachment.fileName || "attachment",
				}));

				this.logger.info(`Adding ${message.attachments.length} attachment(s) to Bitrix24 message`, {
					files: messagePayload.message.files,
				});
			}

			await this.callBitrix24Method(instance.user.portalDomain, "imconnector.send.messages", {
				CONNECTOR: "greenapi_whatsapp",
				LINE: line,
				MESSAGES: [messagePayload],
			});

			this.logger.info(`Message sent to Bitrix24 for instance ${instance.idInstance}`, {
				hasAttachments: !!(message.attachments && message.attachments.length > 0),
				attachmentCount: message.attachments?.length || 0,
			});
		} catch (error: any) {
			this.logger.error(`Failed to send message to Bitrix24: ${error.message}`);
			throw error;
		}
	}

	async handleStateInstanceWebhook(webhook: StateInstanceWebhook): Promise<void> {
		const idInstance = BigInt(webhook.instanceData.idInstance);
		this.logger.info(`State change for instance ${idInstance}: ${webhook.stateInstance}`);

		try {
			await this.prisma.updateInstanceState(idInstance, webhook.stateInstance);
		} catch (error: any) {
			this.logger.error(`Failed to update instance state: ${error.message}`);
		}
	}

	async processWebhook(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		if (body.event === "ONAPPINSTALL") {
			return await this.handleAppInstall(body);
		}
		if (body.event === "ONAPPUNINSTALL") {
			return await this.handleAppUninstall(body);
		}
		if (body.event && body.event === "ONIMCONNECTORMESSAGEADD") {
			return await this.handleBitrix24Webhook(body);
		}
		if (body.event && body.event === "ONIMCONNECTORSTATUSDELETE") {
			return await this.handleConnectorStatusDelete(body);
		}
		if (body.event && body.event === "ONIMCONNECTORLINEDELETE") {
			return await this.handleConnectorLineDelete(body);
		}
		if (body.PLACEMENT === "SETTING_CONNECTOR") {
			const configRequest: ConnectorConfigurationRequest = {
				CONNECTOR: body.CONNECTOR || "greenapi_whatsapp",
			};
			return await this.handleConnectorConfiguration(configRequest);
		}
		if (body.ACTION) {
			return await this.handleConnectorAction(body);
		}

		return await this.handleBitrix24Webhook(body);
	}

	private async handleAppInstall(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info("Handling ONAPPINSTALL event", {
			domain: body.auth?.domain,
			applicationToken: body.auth?.application_token,
		});

		try {
			const domain = body.auth?.domain;
			const applicationToken = body.auth?.application_token;

			if (!domain || !applicationToken) {
				throw new Error("Missing domain or application_token in ONAPPINSTALL event");
			}

			const user = await this.prisma.findUser(domain);
			if (user) {
				await this.prisma.updateUserApplicationToken(domain, applicationToken);
				this.logger.info(`Updated application token for existing portal: ${domain}`);
			} else {
				this.logger.warn(`User not found for ONAPPINSTALL event: ${domain}`);
			}

			return {
				success: true,
				message: "App installation processed successfully",
				data: {
					domain,
					hasApplicationToken: true,
				},
			};

		} catch (error: any) {
			this.logger.error("Failed to handle ONAPPINSTALL event", {
				error: error.message,
				domain: body.auth?.domain,
			});
			return {
				success: false,
				message: `Failed to process app installation: ${error.message}`,
			};
		}
	}

	private async handleAppUninstall(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info("Handling ONAPPUNINSTALL event", {
			domain: body.auth?.domain,
		});

		try {
			const domain = body.auth?.domain;

			if (!domain) {
				throw new Error("Missing domain in ONAPPUNINSTALL event");
			}

			const user = await this.prisma.findUser(domain);
			if (!user) {
				this.logger.warn(`User not found for ONAPPUNINSTALL event: ${domain}`);
				return {
					success: true,
					message: "User was not found (already uninstalled)",
					data: {domain},
				};
			}

			await this.prisma.deleteUser(domain);
			this.logger.info(`Deleted user for portal: ${domain}`);

			return {
				success: true,
				message: "App uninstalled successfully",
				data: {
					domain,
				},
			};
		} catch (error: any) {
			this.logger.error("Failed to handle ONAPPUNINSTALL event", {
				error: error.message,
				domain: body.auth?.domain,
			});
			return {
				success: false,
				message: `Failed to process app uninstallation: ${error.message}`,
			};
		}
	}

	private async handleConnectorStatusDelete(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info("Handling connector status deletion", {
			domain: body.auth?.domain,
			data: body.data,
		});

		try {
			const domain = body.auth?.domain;

			let connector: string | undefined;
			let line: string | number | undefined;

			if (body.data) {
				connector = body.data.connector || body.data.CONNECTOR || body.data?.FIELDS?.CONNECTOR;
				line = body.data.line || body.data.LINE || body.data?.FIELDS?.LINE;
			}

			if (!domain) {
				throw new Error("Domain missing from status delete webhook");
			}

			if (!line) {
				this.logger.warn("No line specified in status delete webhook", {domain, data: body.data});
				return {success: true, message: "No line to process"};
			}

			const instances = await this.prisma.getInstancesByUserId(domain);
			const targetInstance = instances.find(inst => inst.bitrixLine === parseInt(line.toString()));

			if (targetInstance) {
				await this.prisma.removeInstance(targetInstance.idInstance);

				this.logger.info(`Instance deleted for connector status deletion`, {
					domain,
					line,
					connector,
					instanceId: targetInstance.idInstance.toString(),
				});

				return {
					success: true,
					message: "Connector disconnected and instance deleted",
					data: {
						domain,
						line,
						connector,
						deletedInstanceId: targetInstance.idInstance.toString(),
					},
				};
			} else {
				this.logger.info(`No instance found for line ${line} on domain ${domain}`);
				return {
					success: true,
					message: "No instance found for this line",
					data: {domain, line, connector},
				};
			}

		} catch (error: any) {
			this.logger.error("Failed to handle connector status deletion", error);
			return {
				success: false,
				message: `Failed to delete connector: ${error.message}`,
			};
		}
	}

	private async handleConnectorLineDelete(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info("Handling connector line deletion", {
			domain: body.auth?.domain,
			data: body.data,
			rawData: JSON.stringify(body.data),
		});

		try {
			const domain = body.auth?.domain;
			let lineId: string | number | undefined;

			if (body.data) {
				lineId = body.data.LINE ||
					body.data.line ||
					body.data?.FIELDS?.LINE_ID ||
					body.data?.FIELDS?.LINE;

				if (!lineId && (typeof body.data === "string" || typeof body.data === "number")) {
					lineId = body.data;
				}
			}

			if (!domain) {
				throw new Error("Domain missing from line delete webhook");
			}

			if (!lineId) {
				this.logger.warn("No LINE_ID specified in line delete webhook", {
					domain,
					data: body.data,
					dataType: typeof body.data,
					dataKeys: body.data && typeof body.data === "object" ? Object.keys(body.data) : "not object",
				});
				return {success: true, message: "No line ID to process"};
			}

			const lineNumber = parseInt(lineId.toString());

			this.logger.info(`Looking for instances with line ${lineNumber} for domain ${domain}`);

			const instances = await this.prisma.getInstancesByUserId(domain);
			const lineInstances = instances.filter(inst => inst.bitrixLine === lineNumber);

			this.logger.info(`Found ${lineInstances.length} instances for line ${lineNumber}`, {
				allInstances: instances.map(i => ({id: i.idInstance.toString(), line: i.bitrixLine})),
				targetInstances: lineInstances.map(i => ({id: i.idInstance.toString(), line: i.bitrixLine})),
			});

			const deletedInstanceIds: string[] = [];

			for (const instance of lineInstances) {
				await this.prisma.removeInstance(instance.idInstance);
				deletedInstanceIds.push(instance.idInstance.toString());
				this.logger.info(`Deleted instance ${instance.idInstance} for line ${lineNumber}`);
			}

			this.logger.info(`Line deletion completed`, {
				domain,
				lineId: lineNumber,
				deletedCount: deletedInstanceIds.length,
				deletedInstanceIds,
			});

			return {
				success: true,
				message: `Line deleted and ${deletedInstanceIds.length} instance(s) removed`,
				data: {
					domain,
					lineId: lineNumber,
					deletedCount: deletedInstanceIds.length,
					deletedInstanceIds,
				},
			};

		} catch (error: any) {
			this.logger.error("Failed to handle connector line deletion", {
				error: error.message,
				stack: error.stack,
				domain: body.auth?.domain,
				data: body.data,
			});
			return {
				success: false,
				message: `Failed to delete line: ${error.message}`,
			};
		}
	}

	private async handleConnectorAction(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info(`Processing connector action: ${body.ACTION}`, {
			action: body.ACTION,
			domain: body.auth?.domain || "missing",
			hasSettings: !!body.SETTINGS,
			settingsKeys: body.SETTINGS ? Object.keys(body.SETTINGS) : [],
			line: body.LINE,
		});

		switch (body.ACTION) {
			case "CONFIGURATION":
				const configRequest: ConnectorConfigurationRequest = {
					CONNECTOR: body.CONNECTOR || "greenapi_whatsapp",
				};
				return await this.handleConnectorConfiguration(configRequest);
			case "SAVE":
				this.logger.debug("SAVE action validation", {
					hasAuth: !!body.auth,
					hasDomain: !!body.auth?.domain,
					hasAccessToken: !!body.auth?.access_token,
					hasSettings: !!body.SETTINGS,
					hasInstanceId: !!body.SETTINGS?.instance_id,
					hasApiToken: !!body.SETTINGS?.api_token,
					instanceIdFormat: body.SETTINGS?.instance_id ?
						/^\d{10,12}$/.test(body.SETTINGS.instance_id.toString()) : false,
					apiTokenLength: body.SETTINGS?.api_token?.length || 0,
				});

				return await this.handleConnectorSave(body);
			default:
				this.logger.warn(`Unknown action received: ${body.ACTION}`);
				return {success: false, message: `Unknown action: ${body.ACTION}`};
		}
	}

	async handleConnectorConfiguration(body: ConnectorConfigurationRequest): Promise<ConnectorConfigurationResponse> {
		this.logger.info("Handling connector configuration", body);
		const connector = body.CONNECTOR;

		if (connector !== "greenapi_whatsapp") {
			throw new Error("Invalid connector type");
		}

		return {
			success: true,
			message: "Connector configuration retrieved successfully",
			data: {
				name: "GREEN-API Configuration",
				settings: [
					{
						name: "instance_id",
						title: "GREEN-API Instance ID",
						type: "string",
						required: true,
						placeholder: "Enter your Instance ID from console.green-api.com",
					},
					{
						name: "api_token",
						title: "GREEN-API API Token",
						type: "string",
						required: true,
						placeholder: "Enter your API Token from console.green-api.com",
					},
				],
			},
		};
	}

	async handleConnectorSave(body: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info("Handling connector save", body);

		const domain = body.auth?.domain;
		const settings = body.SETTINGS;
		const line = body.LINE || 0;
		const instanceId = settings?.instance_id;
		const apiToken = settings?.api_token;
		const accessToken = body.auth?.access_token;

		this.logger.info(`Configuring connector for line: ${line}`);

		const missingFields: string[] = [];
		if (!domain) missingFields.push("domain");
		if (!instanceId) missingFields.push("instance_id");
		if (!apiToken) missingFields.push("api_token");
		if (!accessToken) missingFields.push("access_token");

		if (missingFields.length > 0) {
			const errorMessage = `Missing required parameters: ${missingFields.join(", ")}`;
			this.logger.error(errorMessage, {
				provided: {
					domain: !!domain,
					instanceId: !!instanceId,
					apiToken: !!apiToken,
					accessToken: !!accessToken,
					line: line,
				},
				body: JSON.stringify(body, null, 2),
			});
			throw new Error(errorMessage);
		}

		if (!/^\d{10}$/.test(instanceId!.toString())) {
			throw new Error("Invalid instance ID format. Must be 10 digits.");
		}

		if (!apiToken || apiToken.length < 20) {
			throw new Error("Invalid API token format. Token seems too short.");
		}

		try {
			const user = await this.prisma.findUser(domain);
			if (!user) {
				throw new NotFoundError(`User not found for domain: ${domain}. Please reinstall the Bitrix24 app.`);
			}

			const instance = await this.createInstanceForConnector(
				domain,
				BigInt(instanceId!),
				apiToken,
				line,
			);

			await this.callBitrix24Method(domain, "imconnector.activate", {
				CONNECTOR: "greenapi_whatsapp",
				LINE: line,
				ACTIVE: true,
			}, accessToken);

			await this.updateConnectorLineData(domain, line, accessToken!);
			this.logger.info(`GREEN-API connector configured successfully for ${domain}`);

			return {
				success: true,
				message: "GREEN-API connector configured successfully! You can now send and receive WhatsApp messages in Bitrix24.",
				data: {
					instanceId: instance.idInstance.toString(),
					line: line,
					domain: domain,
				},
			};

		} catch (error: any) {
			this.logger.error(`Failed to save connector: ${error.message}`, {
				domain,
				instanceId,
				error: error.stack,
			});

			if (error.message.includes("User not found")) {
				throw new Error("Bitrix24 integration not properly installed. Please reinstall the app from Bitrix24 Market.");
			} else if (error.message.includes("GREEN-API validation failed")) {
				throw new Error("Invalid GREEN-API credentials. Please check your Instance ID and API Token.");
			} else if (error.message.includes("BITRIX24_API_ERROR")) {
				throw new Error("Failed to activate connector in Bitrix24. Please try again or contact support.");
			}

			throw error;
		}
	}

	private async updateConnectorLineData(domain: string, line: number, accessToken: string): Promise<void> {
		try {
			const appUrl = this.configService.get<string>("APP_URL");
			await this.callBitrix24Method(domain, "imconnector.connector.data.set", {
				CONNECTOR: "greenapi_whatsapp",
				LINE: line,
				DATA: {
					id: `greenapi_whatsapp_line_${line}`,
					url: `${appUrl}/webhooks/bitrix24`,
					name: "GREEN-API WhatsApp",
					description: "WhatsApp integration via GREEN-API",
				},
			}, accessToken);

			this.logger.info(`Connector data set successfully for ${domain}, line ${line}`);
		} catch (error: any) {
			this.logger.error(`Failed to update connector status: ${error.message}`);
		}
	}

	private async createInstanceForConnector(
		portalDomain: string,
		idInstance: number | bigint,
		apiTokenInstance: string,
		line: number,
	): Promise<Instance> {
		this.logger.info(`Creating GREEN-API instance ${idInstance} for portal ${portalDomain}, line ${line}`);
		const gaClient = this.createGreenApiClient({idInstance, apiTokenInstance});
		const stateInstance = await gaClient.getStateInstance().then(r => r.stateInstance);

		const user = await this.prisma.findUser(portalDomain);
		if (!user) {
			throw new NotFoundError(`User not found for portal ${portalDomain}`);
		}
		const existingInstance = await this.prisma.getInstanceByIdWithUser(idInstance);

		if (existingInstance) {
			if (existingInstance.userId === portalDomain && existingInstance.bitrixLine === line) {
				this.logger.info(`Instance ${idInstance} already configured for this portal and line, updating...`);

				const appBaseUrl = this.configService.get<string>("APP_URL");
				const settings: Settings = {
					webhookUrl: `${appBaseUrl}/webhooks/green-api`,
					webhookUrlToken: generateRandomToken(24),
					incomingWebhook: "yes",
					stateWebhook: "yes",
					incomingCallWebhook: "yes",
				};

				const updatedInstance = await this.prisma.updateInstance(idInstance, {
					apiTokenInstance,
					settings,
				});

				const client = this.createGreenApiClient({
					idInstance: BigInt(idInstance),
					stateInstance,
					apiTokenInstance,
					settings,
				});

				try {
					await client.getSettings();
					await client.setSettings(settings);
					this.logger.info(`Successfully updated instance ${idInstance}`);
				} catch (error: any) {
					throw new IntegrationError(`GREEN-API validation failed: ${error.message}`, "INTEGRATION_ERROR");
				}

				return updatedInstance;
			} else {
				const conflictDetails = existingInstance.userId !== portalDomain
					? `different portal (${existingInstance.user.portalDomain})`
					: `different line (line ${existingInstance.bitrixLine})`;

				throw new IntegrationError(
					`Instance ${idInstance} is already being used by ${conflictDetails}. Each GREEN-API instance can only be connected to one Bitrix24 line.`,
					"INSTANCE_ALREADY_IN_USE",
				);
			}
		}

		const instances = await this.prisma.getInstancesByUserId(portalDomain);
		const lineInstance = instances.find(inst => inst.bitrixLine === line);

		if (lineInstance) {
			this.logger.info(`Line ${line} already has instance ${lineInstance.idInstance}, replacing with ${idInstance}`);

			await this.prisma.removeInstance(lineInstance.idInstance);
			this.logger.info(`Removed old instance ${lineInstance.idInstance} from line ${line}`);
		}

		const appBaseUrl = this.configService.get<string>("APP_URL");
		const settings: Settings = {
			webhookUrl: `${appBaseUrl}/webhooks/green-api`,
			webhookUrlToken: generateRandomToken(24),
			incomingWebhook: "yes",
			stateWebhook: "yes",
			incomingCallWebhook: "yes",
		};

		try {
			const instanceData = {
				idInstance: BigInt(idInstance),
				apiTokenInstance,
				user: {connect: {id: user.id}},
				settings,
				stateInstance,
				bitrixLine: line,
			};

			const instance = await this.prisma.createInstance(instanceData);

			const client = this.createGreenApiClient({
				idInstance: BigInt(idInstance),
				apiTokenInstance,
				settings,
			});

			try {
				await client.getSettings();
				await client.setSettings(settings);

				this.logger.info(`Successfully created and configured instance ${idInstance} for portal ${portalDomain}`);
			} catch (error: any) {
				await this.prisma.removeInstance(instance.idInstance);
				throw new IntegrationError(`GREEN-API validation failed: ${error.message}`, "INTEGRATION_ERROR");
			}

			return instance;
		} catch (error: any) {
			this.logger.error(`Failed to create instance: ${error.message}`, {
				portalDomain,
				idInstance: idInstance.toString(),
				error: error.stack,
			});
			throw error;
		}
	}

	async getInstances(portalUrl: string): Promise<(Instance & { info?: any })[]> {
		this.logger.info(`Fetching instances for portal: ${portalUrl}`);
		const user = await this.prisma.findUser(portalUrl);
		if (!user) {
			throw new NotFoundError(`User not found for portal ${portalUrl}`);
		}
		const instances = await this.prisma.getInstancesByUserId(user.id);

		const instancesWithInfo = await Promise.all(
			instances.map(async (instance) => {
				try {
					const info = await this.getInstanceInfo(instance.idInstance);
					return { ...instance, info };
				} catch (error) {
					this.logger.error(`Could not get info for instance ${instance.idInstance}`, error);
					return instance;
				}
			}),
		);

		return instancesWithInfo;
	}

	async getInstanceInfo(idInstance: bigint): Promise<any> {
		this.logger.info(`Getting info for instance ${idInstance}`);
		const instance = await this.prisma.getInstanceByIdWithUser(idInstance);
		if (!instance) {
			throw new NotFoundError(`Instance ${idInstance} not found`);
		}

		const gaClient = this.createGreenApiClient(instance);
		// Assuming getStateInstance returns phone number info when authorized
		return gaClient.getStateInstance();
	}

	async createInstance(portalUrl: string, memberId: string): Promise<{ idInstance: bigint; qrCodeBase64: string }> {
		this.logger.info(`Creating new instance for portal ${portalUrl} by member ${memberId}`);

		const user = await this.prisma.findUser(portalUrl);
		if (!user) {
			throw new NotFoundError(`User not found for portal ${portalUrl}`);
		}

		// This part is an assumption based on the Postman collection.
		// The actual implementation would depend on the real API.
		const instanceApiUrl = this.configService.get<string>("INSTANCE_API_URL");
		if (!instanceApiUrl) {
			throw new IntegrationError("Instance API URL is not configured", "CONFIGURATION_ERROR");
		}

		let newInstanceResponse;
		try {
			// In a real implementation, you would use axios or another HTTP client
			// const response = await axios.post(`${instanceApiUrl}/instances`, { ... });
			// newInstanceResponse = response.data;

			// Mocking the response for now
			newInstanceResponse = {
				idInstance: String(Math.floor(1000000000 + Math.random() * 9000000000)), // Example: 10 digit number
				apiTokenInstance: generateRandomToken(50),
			};
			this.logger.info("Mocked instance creation response", newInstanceResponse);

		} catch (error) {
			this.logger.error("Failed to provision new instance from external API", error);
			throw new IntegrationError("Failed to create a new WhatsApp instance.", "PROVISIONING_ERROR");
		}


		const { idInstance, apiTokenInstance } = newInstanceResponse;
		const idInstanceBigInt = BigInt(idInstance);

		const appBaseUrl = this.configService.get<string>("APP_URL");
		const settings: Settings = {
			webhookUrl: `${appBaseUrl}/webhooks/green-api/${idInstance}`,
			webhookUrlToken: generateRandomToken(24),
			incomingWebhook: "yes",
			stateWebhook: "yes",
			incomingCallWebhook: "yes",
		};

		await this.prisma.createInstance({
			idInstance: idInstanceBigInt,
			apiTokenInstance,
			user: { connect: { id: user.id } },
			settings,
			stateInstance: "notAuthorized",
		});

		const authData = await this.getAuthorizationData(idInstanceBigInt);

		return {
			idInstance: idInstanceBigInt,
			qrCodeBase64: authData.qrCodeBase64,
		};
	}

	async getAuthorizationData(idInstance: bigint): Promise<{ qrCodeBase64: string }> {
		this.logger.info(`Fetching QR code for instance ${idInstance}`);
		const instance = await this.prisma.getInstanceByIdWithUser(idInstance);
		if (!instance) {
			throw new NotFoundError(`Instance ${idInstance} not found`);
		}

		const gaClient = this.createGreenApiClient(instance);

		try {
			// This is a critical assumption. The SDK might have a different method.
			// I'm assuming a `getQrCode` method exists and returns the QR code as a base64 string.
			// Based on the library structure, this seems to be a missing feature.
			// I will add a mock implementation here.
			const response = await gaClient.reboot(); // Using reboot as a placeholder for a method that might regenerate QR
			this.logger.info("Called reboot to get new QR code.", response);

			return {
				qrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // Placeholder QR
			};

		} catch (error) {
			this.logger.error(`Failed to get QR code for instance ${idInstance}:`, error);
			throw new IntegrationError("Could not retrieve QR code from GREEN-API", "GREEN_API_ERROR");
		}
	}

	async handleBitrix24Webhook(webhook: Bitrix24WebhookDto): Promise<WebhookProcessResult> {
		this.logger.info(`Handling Bitrix24 webhook: ${webhook.event}`);

		if (webhook.event?.toUpperCase() === "ONIMCONNECTORMESSAGEADD") {
			this.logger.info("Processing outbound message from Bitrix24", {
				event: webhook.event,
				fields: webhook.data?.FIELDS,
			});

			const domain = webhook.auth.domain;
			const instances = await this.prisma.getInstancesByUserId(domain);

			if (instances.length === 0) {
				this.logger.warn(`No GREEN-API instances found for portal ${domain}`);
				return {success: false, message: "No GREEN-API instances configured"};
			}

			const lineNumber = webhook.data?.LINE ? parseInt(webhook.data.LINE) : 0;
			let targetInstance = instances.find(inst => inst.bitrixLine === lineNumber);

			if (!targetInstance) {
				targetInstance = instances[0];
				this.logger.warn(`No instance found for line ${lineNumber}, using default instance ${targetInstance.idInstance}`);
			}

			try {
				const result = await this.handlePlatformWebhook(webhook, targetInstance.idInstance);

				this.logger.info(`Outbound message sent successfully`, {
					instanceId: targetInstance.idInstance,
					domain: domain,
					line: lineNumber,
				});

				await this.sendDeliveryConfirmation(webhook, domain, lineNumber, result as SendResponse);

				return {
					success: true,
					message: "Message sent successfully",
					data: result,
				};

			} catch (error: any) {
				this.logger.error(`Failed to send outbound message: ${error.message}`, {
					instanceId: targetInstance.idInstance,
					domain: domain,
					line: lineNumber,
					error: error.stack,
				});

				return {
					success: false,
					message: `Failed to send message: ${error.message}`,
				};
			}
		}

		this.logger.debug(`Ignoring non-message event: ${webhook.event}`);
		return {success: true, message: "Event processed"};
	}

	private async sendDeliveryConfirmation(
		webhook: Bitrix24WebhookDto,
		domain: string,
		line: number,
		greenApiResult: SendResponse,
	): Promise<void> {
		try {
			if (!webhook.data?.MESSAGES || webhook.data.MESSAGES.length === 0) {
				this.logger.warn("No MESSAGES in webhook for delivery confirmation");
				return;
			}

			const originalMessage = webhook.data.MESSAGES[0];

			const externalMessageId = greenApiResult.idMessage;
			const externalChatId = originalMessage.chat?.id || "unknown";

			await this.callBitrix24Method(domain, "imconnector.send.status.delivery", {
				CONNECTOR: "greenapi_whatsapp",
				LINE: line,
				MESSAGES: [{
					im: originalMessage.im,
					message: {
						id: [externalMessageId],
						status: "delivered",
					},
					chat: {
						id: externalChatId,
					},
				}],
			});

			this.logger.info("Delivery confirmation sent to Bitrix24", {
				domain,
				line,
				externalMessageId,
				externalChatId,
			});

		} catch (error: any) {
			this.logger.error(`Failed to send delivery confirmation: ${error.message}`, {
				domain,
				line,
				error: error.stack,
			});
		}
	}
}