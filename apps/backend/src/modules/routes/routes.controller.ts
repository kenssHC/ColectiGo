import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoutesService } from './routes.service';
import { RouteSuggestionsService } from './route-suggestions.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
// Imports regulares (no `import type`): las clases DTO deben existir en runtime
// para que emitDecoratorMetadata las registre y el ValidationPipe valide el body.
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import type { FirebaseAuthPayload } from '../auth/interfaces/firebase-auth-payload.interface';

@Controller('routes')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly routeSuggestionsService: RouteSuggestionsService,
  ) {}

  @Get()
  findAll() {
    return this.routesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.findById(id);
  }

  @Post(':id/suggestions')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  suggest(
    @Param('id', ParseUUIDPipe) routeId: string,
    @Body() dto: CreateSuggestionDto,
    @CurrentUser() currentUser: FirebaseAuthPayload,
  ) {
    return this.routeSuggestionsService.sendSuggestion(routeId, dto, {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.name || currentUser.email.split('@')[0],
    });
  }
}
