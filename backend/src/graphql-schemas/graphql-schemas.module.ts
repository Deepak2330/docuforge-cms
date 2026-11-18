import { Module } from '@nestjs/common';
import { GraphqlSchemasService } from './graphql-schemas.service';
import { GraphqlSchemasController } from './graphql-schemas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GraphqlSchemasController],
  providers: [GraphqlSchemasService],
  exports: [GraphqlSchemasService],
})
export class GraphqlSchemasModule {}
