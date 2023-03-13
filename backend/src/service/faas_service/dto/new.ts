import { FaasRuntime } from '../dao/faas';

export class NewRequestDTO {
  Runtime: FaasRuntime;

  constructor(runtime: FaasRuntime) {
    this.Runtime = runtime;
  }
}

export class NewResponseDTO {
  uuid: string;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}
