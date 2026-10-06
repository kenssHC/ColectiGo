import { create } from 'zustand';
import type { LatLng, PlannerMode, PlannerResponse } from '@collectigo/shared';

interface PlannerState {
  origin: LatLng | null;
  destination: LatLng | null;
  response: PlannerResponse | null;
  mode: PlannerMode;
  /** 0 = mejor ruta; 1+ = índice dentro de las alternativas + 1. */
  selectedIndex: number;
  isCalculating: boolean;
  setOrigin: (origin: LatLng | null) => void;
  setDestination: (destination: LatLng | null) => void;
  setResponse: (response: PlannerResponse | null) => void;
  setMode: (mode: PlannerMode) => void;
  setSelectedIndex: (index: number) => void;
  setCalculating: (calculating: boolean) => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  origin: null,
  destination: null,
  response: null,
  mode: 'balanced',
  selectedIndex: 0,
  isCalculating: false,
  setOrigin: (origin): void => set({ origin }),
  setDestination: (destination): void => set({ destination }),
  setResponse: (response): void => set({ response, selectedIndex: 0 }),
  setMode: (mode): void => set({ mode, response: null, selectedIndex: 0 }),
  setSelectedIndex: (selectedIndex): void => set({ selectedIndex }),
  setCalculating: (isCalculating): void => set({ isCalculating }),
  reset: (): void =>
    set({
      origin: null,
      destination: null,
      response: null,
      selectedIndex: 0,
      isCalculating: false,
    }),
}));
