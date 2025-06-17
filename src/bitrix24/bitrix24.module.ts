import { Module } from '@nestjs/common';
import { Bitrix24Service } from './bitrix24.service';
import { Bitrix24Transformer } from "./bitrix24.transformer";

@Module({
  providers: [Bitrix24Service, Bitrix24Transformer],
  exports: [Bitrix24Service],
})
export class Bitrix24Module {}
