import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiDto } from './dto/create-api.dto';
import { UpdateApiDto } from './dto/update-api.dto';

@Injectable()
export class ApisService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateApiDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.api.create({
      data: {
        projectId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        specType: dto.specType ?? 'REST',
        specId: dto.specId ?? null,
        specVersion: dto.specVersion ?? null,
        operations: dto.operations ?? undefined,
      },
      include: {
        spec: { select: { id: true, title: true, version: true } },
      },
    });
  }

  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.api.findMany({
      where: { projectId, isActive: true },
      include: {
        spec: { select: { id: true, title: true, version: true } },
        _count: { select: { groups: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userId: string) {
    return this.prisma.api.findMany({
      where: {
        isActive: true,
        project: {
          isActive: true,
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        spec: { select: { id: true, title: true, version: true } },
        _count: { select: { groups: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const api = await this.prisma.api.findFirst({
      where: {
        id,
        isActive: true,
        project: {
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        spec: {
          include: {
            versions: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        groups: { include: { group: { select: { id: true, name: true } } } },
      },
    });
    if (!api) throw new NotFoundException('API not found');
    return api;
  }

  async update(id: string, dto: UpdateApiDto, userId: string) {
    const api = await this.findOne(id, userId);
    return this.prisma.api.update({
      where: { id: api.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.specType && { specType: dto.specType }),
        ...(dto.specId !== undefined && { specId: dto.specId }),
        ...(dto.specVersion !== undefined && { specVersion: dto.specVersion }),
        ...(dto.operations !== undefined && { operations: dto.operations as object }),
      },
      include: {
        spec: { select: { id: true, title: true, version: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const api = await this.findOne(id, userId);
    await this.prisma.api.update({ where: { id: api.id }, data: { isActive: false } });
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
}
