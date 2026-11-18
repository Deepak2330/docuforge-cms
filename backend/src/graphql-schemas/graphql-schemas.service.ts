import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGraphqlSchemaDto } from './dto/create-graphql-schema.dto';

@Injectable()
export class GraphqlSchemasService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateGraphqlSchemaDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);

    return this.prisma.graphqlSchema.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        versions: {
          create: {
            version: dto.version,
            sdlContent: dto.sdlContent,
            isPublished: true,
          },
        },
      },
      include: { versions: true },
    });
  }

  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.graphqlSchema.findMany({
      where: { projectId, isActive: true },
      include: {
        _count: { select: { versions: true } },
        versions: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userId: string) {
    return this.prisma.graphqlSchema.findMany({
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

  async findOne(id: string, userId: string) {
    const schema = await this.prisma.graphqlSchema.findFirst({
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
        versions: { orderBy: { createdAt: 'desc' } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!schema) throw new NotFoundException('GraphQL schema not found');
    return schema;
  }

  async addVersion(id: string, dto: CreateGraphqlSchemaDto, userId: string) {
    const schema = await this.findOne(id, userId);
    await this.prisma.graphqlSchemaVersion.updateMany({
      where: { schemaId: schema.id },
      data: { isPublished: false },
    });
    return this.prisma.graphqlSchemaVersion.create({
      data: {
        schemaId: schema.id,
        version: dto.version,
        sdlContent: dto.sdlContent,
        isPublished: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const schema = await this.findOne(id, userId);
    await this.prisma.graphqlSchema.update({ where: { id: schema.id }, data: { isActive: false } });
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
