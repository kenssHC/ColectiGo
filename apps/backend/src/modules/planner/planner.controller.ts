import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlannerService } from './planner.service';
import type { PlannerResponse } from '@collectigo/shared';
// Import regular (no `import type`): la clase debe existir en runtime para que
// emitDecoratorMetadata la registre y el ValidationPipe pueda validar el body.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CalculateRouteDto } from './dto/calculate-route.dto';

@Controller('planner')
export class PlannerController {
  constructor(
    @Inject(PlannerService) private readonly plannerService: PlannerService,
  ) {}

  /** Límite más estricto: es el endpoint más costoso de la API. */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  calculate(@Body() dto: CalculateRouteDto): Promise<PlannerResponse> {
    return dto.mode
      ? this.plannerService.calculate(dto.origin, dto.destination, dto.mode)
      : this.plannerService.calculate(dto.origin, dto.destination);
  }
}
