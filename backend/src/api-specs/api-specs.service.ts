import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiSpecDto } from './dto/create-api-spec.dto';
import { UpdateApiSpecDto } from './dto/update-api-spec.dto';

@Injectable()
export class ApiSpecsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateApiSpecDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);

    return this.prisma.apiSpecification.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        version: dto.version,
        versions: {
          create: {
            version: dto.version,
            specContent: this.parseSpecContent(dto.specContent),
            specFormat: dto.specFormat ?? 'json',
            isPublished: true,
          },
        },
      },
      include: { versions: true },
    });
  }

  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.apiSpecification.findMany({
      where: { projectId, isActive: true },
      include: {
        _count: { select: { versions: true } },
        versions: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userId: string) {
    return this.prisma.apiSpecification.findMany({
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
        _count: { select: { versions: true } },
        versions: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const projectAccess = userId
      ? {
          OR: [
            { isPublic: true },
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        }
      : { isPublic: true };

    const spec = await this.prisma.apiSpecification.findFirst({
      where: {
        id,
        isActive: true,
        project: projectAccess,
      },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!spec) throw new NotFoundException('API spec not found');
    return spec;
  }

  async addVersion(id: string, dto: CreateApiSpecDto, userId: string) {
    const spec = await this.findOne(id, userId);
    return this.prisma.apiSpecificationVersion.create({
      data: {
        specId: spec.id,
        version: dto.version,
        specContent: this.parseSpecContent(dto.specContent),
        specFormat: dto.specFormat ?? 'json',
        isPublished: true,
      },
    });
  }

  async update(id: string, dto: UpdateApiSpecDto, userId: string) {
    const spec = await this.findOne(id, userId);
    return this.prisma.apiSpecification.update({
      where: { id: spec.id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.version && { version: dto.version }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { versions: true, project: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, userId: string) {
    const spec = await this.findOne(id, userId);
    await this.prisma.apiSpecification.update({ where: { id: spec.id }, data: { isActive: false } });
  }

  private parseSpecContent(content: string): object {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
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
