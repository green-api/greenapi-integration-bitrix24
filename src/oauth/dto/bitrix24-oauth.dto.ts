import { IsString } from "class-validator";

export class Bitrix24InstallDto {
	@IsString()
	AUTH_ID: string;

	@IsString()
	AUTH_EXPIRES: string;

	@IsString()
	REFRESH_ID: string;

	@IsString()
	member_id: string;

	@IsString()
	status: string;

	@IsString()
	PLACEMENT: string;

	@IsString()
	PLACEMENT_OPTIONS: string;
}