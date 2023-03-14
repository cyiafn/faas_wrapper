import { FaasRuntime, FaasStatus } from '../dao/faas';

export class GetStatusRequestDTO {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class GetStatusResponseDTO {
  uuid: string;
  status: FaasStatus;
  language: FaasRuntime;
  createdAt: number;

  constructor(res: any) {
    this.uuid = res.uuid;
    this.status = res.status;
    this.language = res.language;
    this.createdAt = res.createdAt;
  }
}
