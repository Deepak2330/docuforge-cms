import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiSpecsService } from './api-specs.service';
import { CreateApiSpecDto } from './dto/create-api-spec.dto';
import { UpdateApiSpecDto } from './dto/update-api-spec.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ApiSpecsController {
  constructor(private readonly apiSpecsService: ApiSpecsService) {}

  @Post('projects/:projectId/api-specs')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateApiSpecDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.apiSpecsService.create(projectId, dto, userId);
  }

  @Get('projects/:projectId/api-specs')
  findAllInProject(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.apiSpecsService.findAllInProject(projectId, userId);
  }

  @Get('api-specs')
  findAll(@CurrentUser('id') userId: string) {
    return this.apiSpecsService.findAll(userId);
  }

  @Get('api-specs/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiSpecsService.findOne(id, userId);
  }

  @Post('api-specs/:id/versions')
  addVersion(
    @Param('id') id: string,
    @Body() dto: CreateApiSpecDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.apiSpecsService.addVersion(id, dto, userId);
  }

  @Patch('api-specs/:id')
  update(@Param('id') id: string, @Body() dto: UpdateApiSpecDto, @CurrentUser('id') userId: string) {
    return this.apiSpecsService.update(id, dto, userId);
  }

  @Delete('api-specs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiSpecsService.remove(id, userId);
  }
}
