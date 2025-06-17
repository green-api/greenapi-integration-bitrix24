import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";

class WebhookAuthDto {
	@IsOptional()
	@IsString()
	access_token?: string;

	@IsOptional()
	@IsString()
	refresh_token?: string;

	@IsOptional()
	@Transform(({value}) => {
		if (value === null || value === undefined) {
			return undefined;
		}
		if (typeof value === "string") {
			const parsed = parseInt(value, 10);
			return isNaN(parsed) ? undefined : parsed;
		}
		if (typeof value === "number") {
			return value;
		}
		return undefined;
	})
	@IsNumber()
	expires_in?: number;

	@IsOptional()
	@IsString()
	scope?: string;

	@IsString()
	domain: string;

	@IsString()
	@IsOptional()
	application_token?: string;

	@IsOptional()
	@IsString()
	client_endpoint?: string;

	@IsOptional()
	@IsString()
	member_id?: string;

	@IsOptional()
	@IsString()
	server_endpoint?: string;
}

export class BitrixFileDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	type?: string;

	@IsOptional()
	@IsString()
	mime?: string;

	@IsOptional()
	@IsString()
	link?: string;

	@IsOptional()
	@IsString()
	width?: string;

	@IsOptional()
	@IsString()
	height?: string;

	@IsOptional()
	@IsString()
	size?: string;

	@IsOptional()
	@IsString()
	sizef?: string;
}

class BitrixMessageDto {
	@IsOptional()
	@IsObject()
	message?: {
		user_id?: string;
		text?: string;
		files?: BitrixFileDto[];
		[key: string]: any;
	};

	@IsOptional()
	@IsObject()
	im?: {
		chat_id?: string;
		message_id?: string;
		[key: string]: any;
	};

	@IsOptional()
	@IsObject()
	chat?: {
		id?: string;
		name?: string;
		[key: string]: any;
	};
}

class WebhookDataFieldsDto {
	@IsOptional()
	@IsString()
	ID?: string;

	@IsOptional()
	@IsString()
	ENTITY_TYPE_ID?: string;

	@IsOptional()
	@IsString()
	ENTITY_ID?: string;

	@IsOptional()
	@IsString()
	MESSAGE?: string;

	@IsOptional()
	@IsString()
	COMMENT?: string;

	@IsOptional()
	@IsString()
	FROM_USER_ID?: string;

	@IsOptional()
	@IsString()
	TO_USER_ID?: string;

	@IsOptional()
	@IsString()
	PHONE?: string;

	@IsOptional()
	@IsString()
	CHAT_ID?: string;

	@IsOptional()
	@IsString()
	DIALOG_ID?: string;

	@IsOptional()
	@IsString()
	ASSIGNED_BY_ID?: string;

	@IsOptional()
	@IsString()
	CONNECTOR?: string;

	@IsOptional()
	@IsNumber()
	LINE?: number;

	@IsOptional()
	@IsString()
	LINE_ID?: string;

	@IsOptional()
	@IsString()
	MESSAGE_TYPE?: string;

	@IsOptional()
	@IsString()
	CHAT_TYPE?: string;

	@IsOptional()
	@IsString()
	CLEAN?: string;

	@IsOptional()
	@IsString()
	LANGUAGE_ID?: string;
}

class WebhookDataDto {
	@IsOptional()
	@IsArray()
	@ValidateNested({each: true})
	@Type(() => BitrixMessageDto)
	MESSAGES?: BitrixMessageDto[];

	@IsOptional()
	@IsString()
	CONNECTOR?: string;

	@IsOptional()
	@IsString()
	LINE?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => WebhookDataFieldsDto)
	FIELDS?: WebhookDataFieldsDto;

	connector?: string;
	line?: string | number;

	@IsOptional()
	@IsString()
	CLEAN?: string;

	@IsOptional()
	@IsString()
	LANGUAGE_ID?: string;
}

export class Bitrix24WebhookDto {
	@IsOptional()
	@IsString()
	event?: string;

	@IsOptional()
	@Transform(({value, obj}) => {
		if (obj.event === "ONIMCONNECTORLINEDELETE" && (typeof value === "string" || typeof value === "number")) {
			return {LINE: value};
		}
		if (obj.event === "ONIMCONNECTORSTATUSDELETE" && value && typeof value === "object") {
			return value;
		}
		return value;
	})
	@ValidateNested()
	@Type(() => WebhookDataDto)
	data?: WebhookDataDto;

	@IsOptional()
	@Transform(({value}) => {
		if (typeof value === "string") {
			const parsed = parseInt(value, 10);
			return isNaN(parsed) ? undefined : parsed;
		}
		return value;
	})
	@IsNumber()
	ts?: number;

	@ValidateNested()
	@Type(() => WebhookAuthDto)
	auth: WebhookAuthDto;

	@IsOptional()
	@IsString()
	ACTION?: string;

	@IsOptional()
	@IsString()
	PLACEMENT?: string;

	@IsOptional()
	@IsString()
	PLACEMENT_OPTIONS?: string;

	@IsOptional()
	SETTINGS?: {
		instance_id?: string;
		api_token?: string;
	};

	@IsOptional()
	@IsNumber()
	LINE?: number;

	@IsOptional()
	@IsString()
	CONNECTOR?: string;

	@IsOptional()
	@IsString()
	event_handler_id?: string;
}