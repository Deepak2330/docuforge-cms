import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('projects/:projectId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Param('projectId') projectId: string) {
    return this.categoriesService.findByProject(projectId);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(projectId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
