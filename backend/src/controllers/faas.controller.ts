import {
  Controller,
  Delete,
  FileTypeValidator,
  HttpCode,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Req,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FaasService } from '../service/faas_service/faas.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewRequestDTO } from '../service/faas_service/dto/new';
import * as multerS3 from 'multer-s3';
import { request } from 'express';
import { GetStatusRequestDTO } from '../service/faas_service/dto/getStatus';
import { DeleteRequestDTO } from '../service/faas_service/dto/delete';

@Controller('faas')
export class FaasController {
  constructor(private readonly faasService: FaasService) {}

  @Post('getDetails')
  getDetails(@Req() request: Request): string {
    return this.faasService.getDetails(request);
  }

  @HttpCode(200)
  @Post('new')
  new(@Request() request: Request): string {
    const req = new NewRequestDTO(request.body[`runtime`]);
    return this.faasService.new(req);
  }

  @HttpCode(200)
  @Post(`uploadCode`)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCode(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: `application/zip` }),
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 * 100 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    await this.faasService.uploadCode(file);

    return;
  }

  @HttpCode(200)
  @Post(`getStatus`)
  async getStatus(@Request() request: Request) {
    return await this.faasService.getStatus(
      new GetStatusRequestDTO(request.body[`uuid`]),
    );
  }

  @HttpCode(200)
  @Post(`delete`)
  async delete(@Request() request: Request) {
    await this.faasService.delete(new DeleteRequestDTO(request.body));
  }
}
