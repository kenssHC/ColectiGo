import { create } from 'zustand';
import type { LatLng, PlannerResponse, PlannerMode } from '@collectigo/shared';

interface PlannerState {
  origin: LatLng | null;
  destination: LatLng | null;
  selectedMode: PlannerMode;
  result: PlannerResponse | null;
  isCalculating: boolean;
  setOrigin: (origin: LatLng | null) => void;
  setDestination: (destination: LatLng | null) => void;
  setSelectedMode: (mode: PlannerMode) => void;
  setResult: (result: PlannerResponse | null) => void;
  setCalculating: (calculating: boolean) => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  origin: null,
  destination: null,
  selectedMode: 'fastest',
  result: null,
  isCalculating: false,
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setSelectedMode: (selectedMode) => set({ selectedMode }),
  setResult: (result) => set({ result }),
  setCalculating: (isCalculating) => set({ isCalculating }),
  reset: () =>
    set({ origin: null, destination: null, result: null, isCalculating: false }),
}));
