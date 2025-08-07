import { IsString, IsNotEmpty } from 'class-validator';

export class CreateInstanceRequestDto {
  @IsString()
  @IsNotEmpty()
  portal_url: string;

  @IsString()
  @IsNotEmpty()
  member_id: string;
}
