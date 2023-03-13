export enum FaasStatus {
  WAITING_FOR_UPLOAD,
  DEPLOYING,
  DELETING,
  SUCCESS,
  FAILURE,
}

export enum FaasRuntime {
  PYTHON,
}

export class FaasDAO {
  uuid: string;
  status: FaasStatus;
  s3Path?: string;
  language: FaasRuntime;
  functionEndpoint?: string;
  createdAt: number;

  constructor(
    uuid: string,
    status: FaasStatus,
    language: FaasRuntime,
    s3Path?: string,
  ) {
    this.uuid = uuid;
    this.status = status;
    this.s3Path = s3Path;
    this.language = language;
    this.createdAt = Date.now();
  }
}

export function getFaasTableName(): string {
  return `faas`;
}
