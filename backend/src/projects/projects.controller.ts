import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('workspaces/:workspaceId/projects')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.create(workspaceId, dto, userId);
  }

  @Get('workspaces/:workspaceId/projects')
  findAllInWorkspace(@Param('workspaceId') workspaceId: string, @CurrentUser('id') userId: string) {
    return this.projectsService.findAllInWorkspace(workspaceId, userId);
  }

  @Get('projects')
  findAll(@CurrentUser('id') userId: string) {
    return this.projectsService.findAll(userId);
  }

  @Get('projects/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.findOne(id, userId);
  }

  @Patch('projects/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectsService.update(id, dto, userId);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.remove(id, userId);
  }
}
