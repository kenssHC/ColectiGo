import { Body, Controller, Post } from '@nestjs/common';
import { PlannerService } from './planner.service';
import type { CalculateRouteDto } from './dto/calculate-route.dto';

@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculateRouteDto) {
    return this.plannerService.calculate(dto.origin, dto.destination);
  }
}
