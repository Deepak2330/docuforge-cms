import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('media')
export class MediaController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.prisma.mediaAsset.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post()
  create(@Body() body: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    storageKey: string;
    projectId?: string;
  }) {
    return this.prisma.mediaAsset.create({ data: body });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.mediaAsset.delete({ where: { id } });
    return { success: true };
  }
}
