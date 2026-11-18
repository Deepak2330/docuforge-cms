import { Module } from '@nestjs/common';
import { ApiGroupsController } from './api-groups.controller';
import { ApiGroupsService } from './api-groups.service';

@Module({
  controllers: [ApiGroupsController],
  providers: [ApiGroupsService],
})
export class ApiGroupsModule {}
