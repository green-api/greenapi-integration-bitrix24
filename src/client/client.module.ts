import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { Bitrix24Module } from '../bitrix24/bitrix24.module';

@Module({
  imports: [Bitrix24Module],
  controllers: [ClientController],
})
export class ClientModule {}
