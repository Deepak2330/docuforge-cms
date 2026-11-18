import { Module } from '@nestjs/common';
import { ReleaseNotesService } from './release-notes.service';
import { ReleaseNotesController } from './release-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReleaseNotesController],
  providers: [ReleaseNotesService],
})
export class ReleaseNotesModule {}
