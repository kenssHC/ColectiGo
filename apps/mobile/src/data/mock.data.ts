import type { PlannerResponse } from '@collectigo/shared';

export const HUANCAYO_CENTER = { lat: -12.0651, lng: -75.2049 };

export const MOCK_PLANNER_RESPONSE: PlannerResponse = {
  shortest: {
    steps: [
      {
        type: 'walk',
        instruction: 'Camina 280m hasta la parada Av. Giraldez con Jr. Puno',
        distance: 280,
        duration: 210,
        from: { lat: -12.0651, lng: -75.2049 },
        to: { lat: -12.0651, lng: -75.2049 },
      },
      {
        type: 'board',
        instruction: 'Sube al colectivo "El Tambo - Centro" en Jr. Puno',
        fare: 1.5,
        routeName: 'El Tambo - Centro',
        vehicleType: 'colectivo',
      },
      {
        type: 'ride',
        instruction: 'Viaja por Av. Giraldez hasta Jr. Ancash',
        distance: 1800,
        duration: 480,
        routeName: 'El Tambo - Centro',
        vehicleType: 'colectivo',
      },
      {
        type: 'arrive',
        instruction: 'Baja en Jr. Ancash y camina 150m hasta tu destino',
        distance: 150,
        duration: 120,
        from: { lat: -12.0700, lng: -75.2100 },
        to: { lat: -12.0710, lng: -75.2115 },
      },
    ],
    totalDistance: 2230,
    totalDuration: 810,
    totalFare: 1.5,
  },
  fastest: {
    steps: [
      {
        type: 'walk',
        instruction: 'Camina 120m hasta la parada Av. Ferrocarril',
        distance: 120,
        duration: 90,
        from: { lat: -12.0651, lng: -75.2049 },
        to: { lat: -12.0641, lng: -75.2060 },
      },
      {
        type: 'board',
        instruction: 'Sube al auto "Chilca Expreso" en Av. Ferrocarril',
        fare: 2.0,
        routeName: 'Chilca Expreso',
        vehicleType: 'auto',
      },
      {
        type: 'ride',
        instruction: 'Viaja directo por la vía rápida hasta Jr. Lima',
        distance: 2400,
        duration: 360,
        routeName: 'Chilca Expreso',
        vehicleType: 'auto',
      },
      {
        type: 'arrive',
        instruction: 'Baja en Jr. Lima y camina 200m hasta tu destino',
        distance: 200,
        duration: 150,
        from: { lat: -12.0700, lng: -75.2100 },
        to: { lat: -12.0710, lng: -75.2115 },
      },
    ],
    totalDistance: 2720,
    totalDuration: 600,
    totalFare: 2.0,
  },
  cheapest: {
    steps: [
      {
        type: 'walk',
        instruction: 'Camina 350m hasta la parada Plaza Huamanmarca',
        distance: 350,
        duration: 260,
        from: { lat: -12.0651, lng: -75.2049 },
        to: { lat: -12.0625, lng: -75.2080 },
      },
      {
        type: 'board',
        instruction: 'Sube al bus "Línea A - Centro" en Plaza Huamanmarca',
        fare: 1.0,
        routeName: 'Línea A - Centro',
        vehicleType: 'bus',
      },
      {
        type: 'ride',
        instruction: 'Viaja hasta la parada Jr. Ancash con Jr. Loreto',
        distance: 1600,
        duration: 600,
        routeName: 'Línea A - Centro',
        vehicleType: 'bus',
      },
      {
        type: 'arrive',
        instruction: 'Baja y camina 320m hasta tu destino',
        distance: 320,
        duration: 240,
        from: { lat: -12.0700, lng: -75.2100 },
        to: { lat: -12.0710, lng: -75.2115 },
      },
    ],
    totalDistance: 2270,
    totalDuration: 1100,
    totalFare: 1.0,
  },
};
