import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { SuggestionType } from '@collectigo/shared';

export class CreateSuggestionDto {
  @IsEnum(['stop_position', 'route_path', 'fare', 'schedule', 'other'])
  type: SuggestionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  description: string;
}
