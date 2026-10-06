import { create } from 'zustand';
import type { LatLng, PlannerResponse } from '@collectigo/shared';

interface PlannerState {
  origin: LatLng | null;
  destination: LatLng | null;
  response: PlannerResponse | null;
  /** 0 = mejor ruta; 1+ = índice dentro de las alternativas + 1. */
  selectedIndex: number;
  isCalculating: boolean;
  setOrigin: (origin: LatLng | null) => void;
  setDestination: (destination: LatLng | null) => void;
  setResponse: (response: PlannerResponse | null) => void;
  setSelectedIndex: (index: number) => void;
  setCalculating: (calculating: boolean) => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  origin: null,
  destination: null,
  response: null,
  selectedIndex: 0,
  isCalculating: false,
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setResponse: (response) => set({ response, selectedIndex: 0 }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
  setCalculating: (isCalculating) => set({ isCalculating }),
  reset: () =>
    set({
      origin: null,
      destination: null,
      response: null,
      selectedIndex: 0,
      isCalculating: false,
    }),
}));
