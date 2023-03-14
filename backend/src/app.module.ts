import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './service/app.service';
import { FaasController } from './controllers/faas.controller';
import { FaasService } from './service/faas_service/faas.service';

@Module({
  imports: [],
  controllers: [AppController, FaasController],
  providers: [AppService, FaasService],
})
export class AppModule {}
