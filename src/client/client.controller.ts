import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { ClientStatusRequestDto } from './dto/client-status.dto';
import { CreateInstanceRequestDto } from './dto/create-instance.dto';
import { InstanceStatusDto } from './dto/instance-status.dto';
import { CreateInstanceResponseDto } from './dto/create-instance-response.dto';

@Controller('api/v1')
export class ClientController {
  constructor(private readonly bitrix24Service: Bitrix24Service) {}

  @Post('client/status')
  @HttpCode(HttpStatus.OK)
  async getClientStatus(
    @Body() clientStatusDto: ClientStatusRequestDto,
  ): Promise<InstanceStatusDto[]> {
    const instances = await this.bitrix24Service.getInstances(clientStatusDto.portal_url);
    return instances.map(instance => ({
      idInstance: instance.idInstance.toString(),
      name: `Instance ${instance.idInstance}`, // Or any other naming convention
      status: instance.stateInstance || 'unknown',
      phoneNumber: instance.info?.wid, // Assuming `wid` contains the phone number
    }));
  }

  @Post('instance/create')
  @HttpCode(HttpStatus.CREATED)
  async createInstance(
    @Body() createInstanceDto: CreateInstanceRequestDto,
  ): Promise<CreateInstanceResponseDto> {
    const { idInstance, qrCodeBase64 } = await this.bitrix24Service.createInstance(
      createInstanceDto.portal_url,
      createInstanceDto.member_id,
    );
    return {
      idInstance: idInstance.toString(),
      qrCodeBase64,
    };
  }
}
