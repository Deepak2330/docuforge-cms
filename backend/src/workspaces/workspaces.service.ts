import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { Role } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Workspace slug already in use');

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        members: {
          create: { userId, role: Role.ADMIN },
        },
      },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } }, isActive: true },
      include: {
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const ws = await this.prisma.workspace.findFirst({
      where: { id, members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } } },
        _count: { select: { projects: true } },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async update(id: string, dto: UpdateWorkspaceDto, userId: string) {
    await this.assertAdmin(id, userId);
    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.assertAdmin(id, userId);
    await this.prisma.workspace.update({ where: { id }, data: { isActive: false } });
  }

  private async assertAdmin(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new NotFoundException('Workspace not found');
    if (member.role !== Role.ADMIN && member.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
