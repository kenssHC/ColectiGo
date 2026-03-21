import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { SuggestionType } from '@collectigo/shared';

export class CreateSuggestionDto {
  @IsEnum(['stop_position', 'route_path', 'fare', 'schedule', 'other'])
  type: SuggestionType;

  @IsString()
  @IsOptional()
  description: string;
}
