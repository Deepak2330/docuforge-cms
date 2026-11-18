import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.prisma.auditLog.findMany({
      take: Math.min(parseInt(limit), 200),
      skip: parseInt(offset),
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
