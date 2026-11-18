import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiGroupsService } from './api-groups.service';
import { CreateApiGroupDto } from './dto/create-api-group.dto';
import { UpdateApiGroupDto } from './dto/update-api-group.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ApiGroupsController {
  constructor(private readonly apiGroupsService: ApiGroupsService) {}

  @Post('projects/:projectId/api-groups')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateApiGroupDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.apiGroupsService.create(projectId, dto, userId);
  }

  @Get('projects/:projectId/api-groups')
  findAllInProject(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.apiGroupsService.findAllInProject(projectId, userId);
  }

  @Get('api-groups')
  findAll(@CurrentUser('id') userId: string) {
    return this.apiGroupsService.findAll(userId);
  }

  @Get('api-groups/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiGroupsService.findOne(id, userId);
  }

  @Patch('api-groups/:id')
  update(@Param('id') id: string, @Body() dto: UpdateApiGroupDto, @CurrentUser('id') userId: string) {
    return this.apiGroupsService.update(id, dto, userId);
  }

  @Delete('api-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiGroupsService.remove(id, userId);
  }
}
