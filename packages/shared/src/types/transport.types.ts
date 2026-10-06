export type VehicleType = 'colectivo' | 'auto' | 'combi' | 'bus';

export type RouteStepType = 'walk' | 'board' | 'ride' | 'transfer' | 'arrive';

/** Sentido de un recorrido: de ida (inicio → fin) o de vuelta (fin → inicio). */
export type RouteDirection = 'ida' | 'vuelta';

export type PlannerMode =
  | 'balanced'
  | 'fastest'
  | 'cheapest'
  | 'less_walking'
  | 'fewer_transfers'
  /** Alias heredado: se interpreta como less_walking. */
  | 'shortest';

export type RouteStatus = 'active' | 'inactive';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export type SuggestionType = 'stop_position' | 'route_path' | 'fare' | 'schedule' | 'other';
