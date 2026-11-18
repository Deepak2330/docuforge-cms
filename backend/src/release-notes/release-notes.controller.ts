import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ReleaseNotesService } from './release-notes.service';
import { CreateReleaseNoteDto } from './dto/create-release-note.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ReleaseNotesController {
  constructor(private readonly releaseNotesService: ReleaseNotesService) {}

  @Post('projects/:projectId/release-notes')
  create(@Param('projectId') projectId: string, @Body() dto: CreateReleaseNoteDto, @CurrentUser('id') userId: string) {
    return this.releaseNotesService.create(projectId, dto, userId);
  }

  @Get('release-notes')
  findAll(@CurrentUser('id') userId: string) {
    return this.releaseNotesService.findAll(userId);
  }

  @Get('projects/:projectId/release-notes')
  findAllInProject(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.releaseNotesService.findAllInProject(projectId, userId);
  }

  @Get('release-notes/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.releaseNotesService.findOne(id, userId);
  }

  @Patch('release-notes/:id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateReleaseNoteDto>, @CurrentUser('id') userId: string) {
    return this.releaseNotesService.update(id, dto, userId);
  }

  @Delete('release-notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.releaseNotesService.remove(id, userId);
  }
}
