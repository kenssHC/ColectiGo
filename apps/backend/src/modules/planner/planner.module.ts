import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { WalkRoutingService } from './walk-routing.service';
import { TrafficService } from './traffic.service';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [RoutesModule],
  providers: [PlannerService, WalkRoutingService, TrafficService],
  controllers: [PlannerController],
})
export class PlannerModule {}
