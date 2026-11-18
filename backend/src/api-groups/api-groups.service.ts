import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiGroupDto } from './dto/create-api-group.dto';
import { UpdateApiGroupDto } from './dto/update-api-group.dto';

const GROUP_INCLUDE = {
  parent: { select: { id: true, name: true } },
  children: { select: { id: true, name: true, slug: true } },
  apis: {
    include: {
      api: {
        select: {
          id: true, name: true, slug: true, specType: true, specId: true, specVersion: true,
          spec: { select: { id: true, title: true, version: true } },
        },
      },
    },
  },
  _count: { select: { apis: true, children: true } },
};

@Injectable()
export class ApiGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateApiGroupDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    const group = await this.prisma.apiGroup.create({
      data: {
        projectId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId ?? null,
      },
    });
    if (dto.apiIds?.length) {
      await this.prisma.apiGroupApi.createMany({
        data: dto.apiIds.map(apiId => ({ groupId: group.id, apiId })),
        skipDuplicates: true,
      });
    }
    return this.prisma.apiGroup.findUnique({ where: { id: group.id }, include: GROUP_INCLUDE });
  }

  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.apiGroup.findMany({
      where: { projectId },
      include: GROUP_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findAll(userId?: string) {
    const projectFilter = userId
      ? {
          isActive: true,
          OR: [
            { isPublic: true },
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        }
      : { isActive: true, isPublic: true };

    return this.prisma.apiGroup.findMany({
      where: { project: projectFilter },
      include: {
        ...GROUP_INCLUDE,
        project: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const group = await this.prisma.apiGroup.findFirst({
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
        ...GROUP_INCLUDE,
        project: { select: { id: true, name: true } },
      },
    });
    if (!group) throw new NotFoundException('API Group not found');
    return group;
  }

  async update(id: string, dto: UpdateApiGroupDto, userId: string) {
    const group = await this.findOne(id, userId);

    await this.prisma.apiGroup.update({
      where: { id: group.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });

    if (dto.apiIds !== undefined) {
      await this.prisma.apiGroupApi.deleteMany({ where: { groupId: id } });
      if (dto.apiIds.length) {
        await this.prisma.apiGroupApi.createMany({
          data: dto.apiIds.map(apiId => ({ groupId: id, apiId })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.apiGroup.findUnique({ where: { id }, include: GROUP_INCLUDE });
  }

  async remove(id: string, userId: string) {
    const group = await this.findOne(id, userId);
    await this.prisma.apiGroup.delete({ where: { id: group.id } });
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
