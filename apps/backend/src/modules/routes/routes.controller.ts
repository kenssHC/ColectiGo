import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import type { CreateRouteDto } from './dto/create-route.dto';
import type { CreateSuggestionDto } from './dto/create-suggestion.dto';
import type { FirebaseAuthPayload } from '../auth/interfaces/firebase-auth-payload.interface';

@Controller('routes')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Get()
  findAll() {
    return this.routesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findById(id);
  }

  @Post(':id/suggestions')
  @UseGuards(FirebaseAuthGuard)
  async suggest(
    @Param('id') routeId: string,
    @Body() dto: CreateSuggestionDto,
    @CurrentUser() currentUser: FirebaseAuthPayload,
  ) {
    const user = await this.usersService.findByFirebaseUid(currentUser.uid);
    return this.routesService.createSuggestion(routeId, dto, user);
  }
}
