import type { SuggestionStatus, SuggestionType } from '../types/transport.types';
export interface RouteSuggestion {
    id: string;
    userId: string;
    routeId: string;
    type: SuggestionType;
    description: string;
    status: SuggestionStatus;
    createdAt: string;
}
