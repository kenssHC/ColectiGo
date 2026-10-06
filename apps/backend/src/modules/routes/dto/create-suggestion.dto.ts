import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { SuggestionType } from '@collectigo/shared';

export class CreateSuggestionDto {
  @IsEnum(['stop_position', 'route_path', 'fare', 'schedule', 'other'])
  type: SuggestionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;
}
