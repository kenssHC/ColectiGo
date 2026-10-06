import {
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { PlannerMode } from '@collectigo/shared';

const PLANNER_MODES: PlannerMode[] = [
  'balanced',
  'fastest',
  'cheapest',
  'less_walking',
  'fewer_transfers',
  'shortest',
];

class LatLngDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class CalculateRouteDto {
  @ValidateNested()
  @Type(() => LatLngDto)
  origin: LatLngDto;

  @ValidateNested()
  @Type(() => LatLngDto)
  destination: LatLngDto;

  @IsOptional()
  @IsIn(PLANNER_MODES)
  mode?: PlannerMode;
}
