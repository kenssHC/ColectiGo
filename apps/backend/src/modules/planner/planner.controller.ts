import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlannerService } from './planner.service';
// Import regular (no `import type`): la clase debe existir en runtime para que
// emitDecoratorMetadata la registre y el ValidationPipe pueda validar el body.
import { CalculateRouteDto } from './dto/calculate-route.dto';

@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  /** Límite más estricto: es el endpoint más costoso de la API. */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  calculate(@Body() dto: CalculateRouteDto) {
    return this.plannerService.calculate(dto.origin, dto.destination);
  }
}
