import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateDocumentDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);

    const existing = await this.prisma.document.findUnique({
      where: { projectId_slug: { projectId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException('Document slug already in use in this project');

    return this.prisma.document.create({
      data: {
        projectId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        content: dto.content,
        docType: dto.docType,
        tags: dto.tags ?? [],
        categoryId: dto.categoryId,
        createdById: userId,
        ownerId: userId,
      },
    });
  }

  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.document.findMany({
      where: { projectId },
      select: {
        id: true, title: true, slug: true, status: true, docType: true,
        tags: true, createdAt: true, updatedAt: true, publishedAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: {
        project: {
          isActive: true,
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
      select: {
        id: true, title: true, slug: true, status: true, docType: true,
        tags: true, createdAt: true, updatedAt: true, publishedAt: true,
        project: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        project: {
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, userId: string) {
    await this.assertDocumentAccess(id, userId);
    return this.prisma.document.update({ where: { id }, data: dto });
  }

  async publish(id: string, userId: string) {
    await this.assertDocumentAccess(id, userId);
    return this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async unpublish(id: string, userId: string) {
    await this.assertDocumentAccess(id, userId);
    return this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.DRAFT, publishedAt: null },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertDocumentAccess(id, userId);
    await this.prisma.document.delete({ where: { id } });
  }

  private async assertProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { members: { some: { userId } } },
          { workspace: { members: { some: { userId } } } },
        ],
      },
    });
    if (!project) throw new ForbiddenException('Not a member of this project');
  }

  private async assertDocumentAccess(id: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        project: {
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
  }
}
