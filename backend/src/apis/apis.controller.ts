import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApisService } from './apis.service';
import { CreateApiDto } from './dto/create-api.dto';
import { UpdateApiDto } from './dto/update-api.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ApisController {
  constructor(private readonly apisService: ApisService) {}

  @Post('projects/:projectId/apis')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateApiDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.apisService.create(projectId, dto, userId);
  }

  @Get('projects/:projectId/apis')
  findAllInProject(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.apisService.findAllInProject(projectId, userId);
  }

  @Get('apis')
  findAll(@CurrentUser('id') userId: string) {
    return this.apisService.findAll(userId);
  }

  @Get('apis/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apisService.findOne(id, userId);
  }

  @Patch('apis/:id')
  update(@Param('id') id: string, @Body() dto: UpdateApiDto, @CurrentUser('id') userId: string) {
    return this.apisService.update(id, dto, userId);
  }

  @Delete('apis/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apisService.remove(id, userId);
  }
}
