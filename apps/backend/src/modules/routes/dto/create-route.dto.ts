import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { VehicleType } from '@collectigo/shared';

export class CreateStopDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  order: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['colectivo', 'auto', 'bus'])
  type: VehicleType;

  @IsNumber()
  @Min(0)
  fare: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  polyline?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStopDto)
  stops: CreateStopDto[];
}
