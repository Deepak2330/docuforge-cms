import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReleaseNoteDto } from './dto/create-release-note.dto';

@Injectable()
export class ReleaseNotesService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateReleaseNoteDto, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.releaseNote.create({
      data: {
        projectId,
        title: dto.title,
        version: dto.version,
        releaseDate: new Date(dto.releaseDate),
        features: dto.features ?? [],
        improvements: dto.improvements ?? [],
        bugFixes: dto.bugFixes ?? [],
        breakingChanges: dto.breakingChanges ?? [],
        content: dto.content,
        isPublished: dto.isPublished ?? false,
        ...(dto.isPublished && { publishedAt: new Date() }),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.releaseNote.findMany({
      where: {
        project: {
          isActive: true,
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
      include: { project: { select: { id: true, name: true, slug: true } } },
      orderBy: { releaseDate: 'desc' },
    });
  }

  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);
    return this.prisma.releaseNote.findMany({
      where: { projectId },
      orderBy: { releaseDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.releaseNote.findFirst({
      where: {
        id,
        project: {
          OR: [
            { members: { some: { userId } } },
            { workspace: { members: { some: { userId } } } },
          ],
        },
      },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!note) throw new NotFoundException('Release note not found');
    return note;
  }

  async update(id: string, dto: Partial<CreateReleaseNoteDto>, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.releaseNote.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.releaseDate && { releaseDate: new Date(dto.releaseDate) }),
        ...(dto.isPublished && { publishedAt: new Date() }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.releaseNote.delete({ where: { id } });
  }

  private async assertProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, OR: [{ members: { some: { userId } } }, { workspace: { members: { some: { userId } } } }] },
    });
    if (!project) throw new ForbiddenException('Not a member of this project');
  }
}
