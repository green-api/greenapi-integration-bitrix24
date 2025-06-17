import { Controller, Post, Body, Res, HttpStatus, HttpException, Head, Query } from "@nestjs/common";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { GreenApiLogger } from "@green-api/greenapi-integration";
import axios from "axios";
import { Bitrix24InstallDto } from "./dto/bitrix24-oauth.dto";
import { BitrixInstallQuery } from "../types";

@Controller("oauth")
export class OAuthController {
	private readonly logger = GreenApiLogger.getInstance(OAuthController.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly prisma: PrismaService,
	) {}

	@Head("install")
	async installHead(@Res() res: Response) {
		res.status(200).send();
	}

	@Post("install")
	async install(
		@Body() body: Bitrix24InstallDto,
		@Query() query: BitrixInstallQuery,
		@Res() res: Response,
	) {
		this.logger.info("Bitrix24 webhook received", body);

		const domain = query.DOMAIN;
		const accessToken = body.AUTH_ID;
		const refreshToken = body.REFRESH_ID;
		const expiresIn = body.AUTH_EXPIRES;

		if (!domain || !accessToken) {
			this.logger.error("Missing required OAuth parameters", {domain, hasAccessToken: !!accessToken});
			throw new HttpException("Missing required OAuth parameters", HttpStatus.BAD_REQUEST);
		}

		if (body.PLACEMENT === "SETTING_CONNECTOR") {
			return this.handleConnectorSettings(body, res, query.LANG);
		}

		try {
			const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 1000) : null;
			const tempApplicationToken = `temp_${Date.now()}`;

			await this.prisma.createUser({
				id: domain,
				portalDomain: domain,
				accessToken: accessToken,
				refreshToken: refreshToken,
				tokenExpiresAt: expiresAt,
				applicationToken: tempApplicationToken,
			});

			this.logger.log(`Bitrix24 app installed for portal: ${domain}`);

			await this.registerMessengerConnector(domain, accessToken);
			await this.registerBitrix24Webhooks(domain, accessToken);

			res.setHeader("Content-Type", "text/html");
			res.setHeader("X-Frame-Options", "ALLOWALL");
			res.setHeader("Content-Security-Policy", "frame-ancestors *");

			const html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<title>Installation Success</title>
				<script src="//api.bitrix24.com/api/v1/"></script>
				<style>
					body {
						font-family: Arial, sans-serif;
						padding: 40px;
						background: #f8f9fa;
						margin: 0;
						text-align: center;
					}
					.container {
						max-width: 500px;
						margin: 0 auto;
						background: white;
						border-radius: 12px;
						padding: 40px;
						box-shadow: 0 4px 20px rgba(0,0,0,0.08);
					}
					.success {
						background: #d4edda;
						color: #155724;
						padding: 20px;
						border-radius: 8px;
						margin-bottom: 20px;
						font-weight: bold;
					}
					.instructions {
						color: #666;
						line-height: 1.6;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="success">
						✅ GREEN-API WhatsApp Integration Installed Successfully!
					</div>
				</div>
				<script>
					if (typeof BX24 !== 'undefined') {
						BX24.init(() => {
                            BX24.installFinish();
						});
					}
				</script>
			</body>
			</html>`;

			return res.status(201).send(html);

		} catch (error: any) {
			this.logger.error(`OAuth installation failed: ${error.message}`, error);
			res.setHeader("Content-Type", "text/html");
			res.setHeader("X-Frame-Options", "ALLOWALL");
			res.setHeader("Content-Security-Policy", "frame-ancestors *");

			const errorHtml = `<!DOCTYPE html>
			<html lang="en">
			<body style="font-family: Arial,serif; padding: 40px; text-align: center;">
				<div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px;">
					❌ Installation Failed: ${error.message}
				</div>
			</body>
			</html>`;

			return res.status(500).send(errorHtml);
		}
	}

	private getConnectorTranslations(language: string) {
		const isRussian = language === "ru";

		return {
			title: isRussian ? "Настройки GREEN-API канала" : "GREEN-API Connector Settings",
			header: {
				title: isRussian ? "GREEN-API WhatsApp" : "GREEN-API WhatsApp Connector",
				subtitle: isRussian ? "Настройте ваш WhatsApp инстанс" : "Configure your WhatsApp instance",
				lineInfo: isRussian ? "Линия:" : "Line:",
			},
			form: {
				instanceId: {
					label: isRussian ? "ID Инстанса" : "Instance ID",
					placeholder: isRussian ? "Например, 7103190270" : "e.g., 7103190270",
					description: isRussian ? "Получите его в" : "Get from",
					linkText: isRussian ? "консоли GREEN-API" : "GREEN-API Console",
				},
				apiToken: {
					label: isRussian ? "API Токен" : "API Token",
					placeholder: isRussian ? "Ваш API токен" : "Your API Token",
					description: isRussian ? "Получите его в" : "Get from",
					linkText: isRussian ? "консоли GREEN-API" : "GREEN-API Console",
				},
				saveButton: isRussian ? "Сохранить настройки" : "Save Configuration",
			},
			messages: {
				fillAllFields: isRussian ? "Пожалуйста, заполните все поля" : "Please fill in all fields",
				invalidInstanceId: isRussian ? "ID инстанса должен содержать 10 цифр" : "Instance ID must be 10 digits",
				tokenTooShort: isRussian ? "API токен слишком короткий" : "API Token seems too short",
				configSaved: isRussian ? "✅ Настройки сохранены!" : "✅ Configuration saved!",
				saveFailed: isRussian ? "❌ Ошибка:" : "❌ Error:",
				networkError: isRussian ? "❌ Ошибка сети" : "❌ Network error",
				failed: isRussian ? "Не удалось" : "Failed",
			},
		};
	}

	private handleConnectorSettings(body: Bitrix24InstallDto, res: Response, lang: string) {
		let placementOptions = {};
		try {
			if (body.PLACEMENT_OPTIONS) {
				placementOptions = JSON.parse(body.PLACEMENT_OPTIONS);
				this.logger.info("Parsed placement options:", placementOptions);
			}
		} catch (e) {
			this.logger.warn("Could not parse placement options:", e);
		}

		const languageId = lang || "en";
		const t = this.getConnectorTranslations(languageId);

		res.setHeader("Content-Type", "text/html");
		res.setHeader("X-Frame-Options", "ALLOWALL");
		res.setHeader("Content-Security-Policy", "frame-ancestors *");

		const html = `<!DOCTYPE html>
	<html lang="${languageId === "ru" ? "ru" : "en"}">
	<head>
		<title>${t.title}</title>
		<script src="//api.bitrix24.com/api/v1/"></script>
		<style>
			body { 
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
				padding: 20px;
				background: #f8f9fa;
				margin: 0;
			}
			.container {
				max-width: 500px;
				margin: 0 auto;
				background: white;
				border-radius: 12px;
				box-shadow: 0 4px 20px rgba(0,0,0,0.08);
				padding: 30px;
			}
			.header { text-align: center; margin-bottom: 30px; }
			.logo {
				width: 48px; height: 48px;
				background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
				border-radius: 12px; margin: 0 auto 15px;
				display: flex; align-items: center; justify-content: center;
				color: white; font-size: 24px;
			}
			h2 { color: #333; margin-bottom: 8px; }
			.subtitle { color: #666; font-size: 14px; }
			.form-group { margin-bottom: 24px; }
			label { 
				display: block; margin-bottom: 8px; 
				font-weight: 600; color: #333; font-size: 14px;
			}
			input[type="text"] { 
				width: 100%; padding: 14px 16px; 
				border: 2px solid #e0e0e0; border-radius: 8px;
				font-size: 15px; background: #fff;
				box-sizing: border-box;
			}
			input[type="text"]:focus {
				outline: none; border-color: #25D366;
				box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
			}
			button { 
				background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
				color: white; padding: 16px 24px; border: none;
				border-radius: 8px; cursor: pointer; font-size: 16px;
				font-weight: 600; width: 100%; margin-top: 10px;
				transition: all 0.3s ease; position: relative;
				display: flex;
				align-items: center;
				justify-content: center;
				min-height: 56px;
			}
			button:hover {
				background: linear-gradient(135deg, #128C7E 0%, #0f6b5c 100%);
				transform: translateY(-2px);
				box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3);
			}
			button:disabled {
				opacity: 0.7; cursor: not-allowed; transform: none;
			}
			.loading { opacity: 0.7; pointer-events: none; }
			.spinner {
				display: none; width: 20px; height: 20px;
				border: 2px solid #ffffff; border-top: 2px solid transparent;
				border-radius: 50%; animation: spin 1s linear infinite;
				margin-right: 10px;
				flex-shrink: 0;
			}
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			button.loading .spinner { display: block; }
			.description { color: #888; font-size: 12px; margin-top: 6px; }
			.help-link { color: #25D366; text-decoration: none; font-weight: 500; }
			.status {
				padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;
				font-size: 14px; display: none; font-weight: 500;
			}
			.status.success { background: #d4edda; color: #155724; }
			.status.error { background: #f8d7da; color: #721c24; }
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<div class="logo">📱</div>
				<h2>${t.header.title}</h2>
				<p class="subtitle">${t.header.subtitle}</p>
				<div id="lineInfo" style="font-weight: bold; color: #25D366; display: none;">
					${t.header.lineInfo} <span id="lineNumber">0</span>
				</div>
			</div>
			
			<div id="status" class="status"></div>
			
			<form id="connectorForm">
				<div class="form-group">
					<label for="instance_id">${t.form.instanceId.label}</label>
					<input type="text" id="instance_id" placeholder="${t.form.instanceId.placeholder}" required>
					<div class="description">
						${t.form.instanceId.description} <a href="https://console.green-api.com" target="_blank" class="help-link">${t.form.instanceId.linkText}</a>
					</div>
				</div>
				
				<div class="form-group">
					<label for="api_token">${t.form.apiToken.label}</label>
					<input type="text" id="api_token" placeholder="${t.form.apiToken.placeholder}" required>
					<div class="description">
						${t.form.apiToken.description} <a href="https://console.green-api.com" target="_blank" class="help-link">${t.form.apiToken.linkText}</a>
					</div>
				</div>
				
				<button type="submit" id="saveBtn">
					<span class="spinner"></span>
					${t.form.saveButton}
				</button>
			</form>
		</div>

		<script>
		const placementOptions = ${JSON.stringify(placementOptions)};
		const translations = ${JSON.stringify(t.messages)};
		
		function showStatus(message, type) {
			const status = document.getElementById('status');
			status.textContent = message;
			status.className = 'status ' + type;
			status.style.display = 'block';
		}
		
		function setLoading(loading) {
			const form = document.getElementById('connectorForm');
			const btn = document.getElementById('saveBtn');
			
			if (loading) {
				form.classList.add('loading');
				btn.classList.add('loading');
				btn.disabled = true;
			} else {
				form.classList.remove('loading');
				btn.classList.remove('loading');
				btn.disabled = false;
			}
		}
		
		BX24.init(() => {
			const domain = BX24.getDomain();
			const auth = BX24.getAuth();
			
			if (placementOptions.LINE) {
				document.getElementById('lineNumber').textContent = placementOptions.LINE;
				document.getElementById('lineInfo').style.display = 'block';
			}
			
			if (BX24.resizeWindow) BX24.resizeWindow(600, 600);
			
			document.getElementById('connectorForm').addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const instanceId = document.getElementById('instance_id').value.trim();
				const apiToken = document.getElementById('api_token').value.trim();
				
				if (!instanceId || !apiToken) {
					showStatus(translations.fillAllFields, 'error');
					return;
				}
				
				if (!/^[0-9]{10,12}$/.test(instanceId)) {
					showStatus(translations.invalidInstanceId, 'error');
					return;
				}
				
				if (apiToken.length < 32) {
					showStatus(translations.tokenTooShort, 'error');
					return;
				}
				
				setLoading(true);
				
				try {
					const response = await fetch('/webhooks/bitrix24', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							ACTION: 'SAVE',
							SETTINGS: { instance_id: instanceId, api_token: apiToken },
							LINE: parseInt(placementOptions.LINE) || 0,
							auth: {
								domain: domain,
								access_token: auth.access_token,
								refresh_token: auth.refresh_token || null
							}
						})
					});
					
					const data = await response.json();
					
					if (data.success) {
						showStatus(translations.configSaved, 'success');
						setTimeout(() => BX24.closeApplication && BX24.closeApplication(), 2000);
					} else {
						showStatus(translations.saveFailed + ' ' + (data.message || translations.failed), 'error');
					}
				} catch (error) {
					showStatus(translations.networkError, 'error');
				} finally {
					setLoading(false);
				}
			});
		});
		</script>
	</body>
	</html>`;

		return res.send(html);
	}

	private async registerBitrix24Webhooks(domain: string, accessToken: string): Promise<void> {
		const appUrl = this.configService.get<string>("APP_URL");
		const webhookUrl = `${appUrl}/webhooks/bitrix24`;

		const eventsToRegister = [
			"ONAPPINSTALL",
			"ONAPPUNINSTALL",
			"ONIMCONNECTORMESSAGEADD",
			"ONIMCONNECTORSTATUSDELETE",
			"ONIMCONNECTORLINEDELETE",
		];

		for (const event of eventsToRegister) {
			try {
				await axios.post(`https://${domain}/rest/event.bind?auth=${accessToken}`, {
					event,
					handler: webhookUrl,
					auth_type: 1,
				});
				this.logger.info(`Registered webhook for event: ${event}`, {domain});
			} catch (error: any) {
				this.logger.error(`Failed to register ${event}:`, {
					domain,
					status: error.response?.status,
					data: error.response?.data,
					message: error.message,
				});
			}
		}
	}

	private async registerMessengerConnector(domain: string, accessToken: string) {
		const baseUrl = `https://${domain}/rest`;
		const appUrl = this.configService.get<string>("APP_URL");

		try {
			const connectorId = "greenapi_whatsapp";
			this.logger.log(`Registering GREEN-API connector for ${domain}`);

			const icon = `<?xml version="1.0" encoding="UTF-8"?>
							<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
							<!-- Creator: CorelDRAW -->
							<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="1000px" height="1000px" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd"
							viewBox="0 0 98.822 98.823"
							 xmlns:xlink="http://www.w3.org/1999/xlink"
							 xmlns:xodm="http://www.corel.com/coreldraw/odm/2003">
							 <defs>
							  <style type="text/css">
							   <![CDATA[
								.fil0 {fill:#3B9702}
								.fil1 {fill:white}
								.fil2 {fill:white;fill-rule:nonzero}
							   ]]>
							  </style>
							 </defs>
							 <g id="Слой_x0020_1">
							  <metadata id="CorelCorpID_0Corel-Layer"/>
							  <g id="_2274748282416">
							   <circle class="fil0" cx="49.411" cy="49.411" r="49.411"/>
							   <path class="fil1" d="M80.075 18.748c-7.846,-7.847 -18.688,-12.701 -30.663,-12.701 -11.976,0 -22.818,4.854 -30.664,12.701 -7.847,7.847 -12.701,18.689 -12.701,30.664 0,11.975 4.854,22.817 12.701,30.664 7.847,7.846 18.689,12.7 30.664,12.7 11.975,0 22.816,-4.853 30.663,-12.7 7.847,-7.847 12.701,-18.689 12.701,-30.664 0,-11.975 -4.854,-22.817 -12.701,-30.664zm-3.425 3.425c-6.971,-6.97 -16.601,-11.282 -27.238,-11.282 -10.638,0 -20.269,4.312 -27.239,11.282 -6.97,6.97 -11.282,16.601 -11.282,27.239 0,10.637 4.312,20.268 11.282,27.238 6.97,6.97 16.601,11.282 27.239,11.282 10.637,0 20.267,-4.311 27.238,-11.282 6.97,-6.97 11.281,-16.601 11.281,-27.238 0,-10.638 -4.311,-20.268 -11.281,-27.239z"/>
							   <path class="fil2" d="M50.839 74.623c-3.9,0 -7.417,-0.627 -10.552,-1.88 -3.134,-1.254 -5.838,-3.018 -8.113,-5.293 -2.275,-2.275 -4.016,-4.945 -5.224,-8.01 -1.207,-3.064 -1.81,-6.407 -1.81,-10.029 0,-3.622 0.65,-6.964 1.95,-10.029 1.3,-3.064 3.122,-5.734 5.466,-8.009 2.346,-2.275 5.131,-4.04 8.358,-5.293 3.227,-1.254 6.768,-1.881 10.622,-1.881 2.646,0 5.165,0.348 7.556,1.045 2.391,0.697 4.573,1.648 6.547,2.855 1.973,1.208 3.61,2.577 4.91,4.11l-7.313 7.661c-1.671,-1.579 -3.47,-2.821 -5.397,-3.726 -1.927,-0.906 -4.098,-1.358 -6.513,-1.358 -1.996,0 -3.842,0.359 -5.536,1.079 -1.695,0.72 -3.181,1.741 -4.457,3.065 -1.277,1.323 -2.264,2.878 -2.961,4.666 -0.696,1.787 -1.044,3.726 -1.044,5.815 0,2.09 0.371,4.017 1.114,5.781 0.743,1.765 1.776,3.308 3.1,4.632 1.322,1.323 2.866,2.356 4.631,3.099 1.764,0.743 3.668,1.114 5.711,1.114 1.439,0 2.774,-0.22 4.005,-0.661 1.23,-0.442 2.321,-1.045 3.273,-1.811 0.952,-0.767 1.695,-1.672 2.229,-2.717 0.533,-1.045 0.801,-2.17 0.801,-3.377l0 -1.811 1.532 2.367 -13.303 0 0 -9.402 22.914 0c0.093,0.511 0.163,1.207 0.209,2.09 0.046,0.882 0.081,1.729 0.104,2.542 0.024,0.813 0.035,1.451 0.035,1.915 0,3.157 -0.568,6.047 -1.706,8.671 -1.137,2.624 -2.739,4.887 -4.806,6.791 -2.066,1.903 -4.492,3.378 -7.278,4.422 -2.785,1.045 -5.804,1.567 -9.054,1.567l0 0z"/>
							  </g>
							 </g>
							</svg>
							`;

			const registerResponse = await axios.post(
				`${baseUrl}/imconnector.register?auth=${accessToken}`,
				{
					ID: connectorId,
					NAME: "GREEN-API WhatsApp",
					PLACEMENT_HANDLER: `${appUrl}/oauth/install`,
					ICON: {
						DATA_IMAGE: "data:image/svg+xml;charset=US-ASCII," + encodeURIComponent(icon),
					},
				},
			);
			if (registerResponse.data.error) {
				throw new Error(`Failed to register connector: ${registerResponse.data.error_description}`);
			}
			this.logger.log(`Connector registered successfully for ${domain}`);
		} catch (error: any) {
			this.logger.error(`Failed to register messenger connector: ${error.message}`, error);
			throw error;
		}
	}
}