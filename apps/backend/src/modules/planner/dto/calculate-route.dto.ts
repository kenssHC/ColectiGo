import { IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LatLngDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CalculateRouteDto {
  @ValidateNested()
  @Type(() => LatLngDto)
  origin: LatLngDto;

  @ValidateNested()
  @Type(() => LatLngDto)
  destination: LatLngDto;
}
