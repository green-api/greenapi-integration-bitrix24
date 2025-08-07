import { IsString, IsNotEmpty } from 'class-validator';

export class ClientStatusRequestDto {
  @IsString()
  @IsNotEmpty()
  portal_url: string;
}
