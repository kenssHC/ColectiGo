export type VehicleType = 'colectivo' | 'auto' | 'combi' | 'bus';

export type RouteStepType = 'walk' | 'board' | 'ride' | 'transfer' | 'arrive';

/** Sentido de un recorrido: de ida (inicio → fin) o de vuelta (fin → inicio). */
export type RouteDirection = 'ida' | 'vuelta';

export type PlannerMode = 'shortest' | 'fastest' | 'cheapest';

export type RouteStatus = 'active' | 'inactive';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export type SuggestionType = 'stop_position' | 'route_path' | 'fare' | 'schedule' | 'other';
