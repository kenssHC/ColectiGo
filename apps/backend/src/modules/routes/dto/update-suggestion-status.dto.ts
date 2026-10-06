import { IsEnum } from 'class-validator';
import type { SuggestionStatus } from '@collectigo/shared';

export class UpdateSuggestionStatusDto {
  @IsEnum(['approved', 'rejected'])
  status: Extract<SuggestionStatus, 'approved' | 'rejected'>;
}
