export class DeleteRequestDTO {
  uuid: string;

  constructor(req: any) {
    this.uuid = req.uuid;
  }
}
