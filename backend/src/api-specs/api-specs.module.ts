import { Module } from '@nestjs/common';
import { ApiSpecsService } from './api-specs.service';
import { ApiSpecsController } from './api-specs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiSpecsController],
  providers: [ApiSpecsService],
  exports: [ApiSpecsService],
})
export class ApiSpecsModule {}
