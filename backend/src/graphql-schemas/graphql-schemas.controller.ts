import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { GraphqlSchemasService } from './graphql-schemas.service';
import { CreateGraphqlSchemaDto } from './dto/create-graphql-schema.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class GraphqlSchemasController {
  constructor(private readonly graphqlSchemasService: GraphqlSchemasService) {}

  @Post('projects/:projectId/graphql-schemas')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateGraphqlSchemaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.graphqlSchemasService.create(projectId, dto, userId);
  }

  @Get('projects/:projectId/graphql-schemas')
  findAllInProject(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.graphqlSchemasService.findAllInProject(projectId, userId);
  }

  @Get('graphql-schemas')
  findAll(@CurrentUser('id') userId: string) {
    return this.graphqlSchemasService.findAll(userId);
  }

  @Get('graphql-schemas/:id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.graphqlSchemasService.findOne(id, userId);
  }

  @Post('graphql-schemas/:id/versions')
  addVersion(
    @Param('id') id: string,
    @Body() dto: CreateGraphqlSchemaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.graphqlSchemasService.addVersion(id, dto, userId);
  }

  @Delete('graphql-schemas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.graphqlSchemasService.remove(id, userId);
  }
}
