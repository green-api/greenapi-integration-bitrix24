import { InstanceState } from "@prisma/client";

export class InstanceStatusDto {
  idInstance: string;
  name: string;
  status: InstanceState | string;
  phoneNumber?: string;
}
