import { User } from "@prisma/client";

export interface Bitrix24PlatformMessage {
	id: string;
	entityType: "CONTACT" | "LEAD" | "DEAL";
	entityId: number;
	message: string;
	direction: "inbound" | "outbound";
	attachments?: Array<{
		url: string;
		fileName?: string;
		type?: string;
	}>;
	phone: string;
	portalDomain: string;
	senderName: string;
}

export interface Bitrix24MessagePayload {
	user: {
		id: string;
		name: string;
		phone: string;
	};
	message: {
		id: string;
		date: number;
		text: string;
		files?: Array<{
			url: string;
			name: string;
		}>;
	};
	chat: {
		id: string;
		name: string;
		url: string | null;
	};
}

export type UserCreateData = Omit<User, "createdAt" | "updatedAt" | "instances">;
export type UserUpdateData = Partial<Omit<UserCreateData, "id">>;

export interface ConnectorConfigurationRequest {
	CONNECTOR: string;
}

export interface BitrixInstallQuery {
  DOMAIN: string;
  LANG: string;
}

export interface ConnectorSetting {
	name: string;
	title: string;
	type: string;
	required: boolean;
	placeholder: string;
}

export interface ConnectorConfigurationResponse {
	success: boolean;
	message: string;
	data: {
		name: string;
		settings: ConnectorSetting[];
	};
}

export interface WebhookProcessResult {
	success: boolean;
	message: string;
	data?: Record<string, any>;
}