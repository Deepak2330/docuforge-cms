import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('projects/:projectId/documents')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.documentsService.create(projectId, dto, userId);
  }

  @Get('projects/:projectId/documents')
  findAllInProject(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.documentsService.findAllInProject(projectId, userId);
  }

  @Get('documents')
  findAll(@CurrentUser('id') userId: string) {
    return this.documentsService.findAll(userId);
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.documentsService.findOne(id, userId);
  }

  @Patch('documents/:id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser('id') userId: string) {
    return this.documentsService.update(id, dto, userId);
  }

  @Post('documents/:id/publish')
  publish(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.documentsService.publish(id, userId);
  }

  @Post('documents/:id/unpublish')
  unpublish(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.documentsService.unpublish(id, userId);
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.documentsService.remove(id, userId);
  }
}
