import { getVehiclePresentation } from '../vehicle-presentation';

describe('getVehiclePresentation', () => {
  it.each([
    ['colectivo', 'Colectivo', 'car-outline'],
    ['auto', 'Auto', 'car-outline'],
    ['combi', 'Combi', 'car-sport-outline'],
    ['bus', 'Bus', 'bus-outline'],
  ] as const)('presenta %s con su etiqueta e ícono', (type, label, icon) => {
    expect(getVehiclePresentation(type)).toEqual({ label, icon });
  });

  it('usa un fallback neutral cuando el tipo no está disponible', () => {
    expect(getVehiclePresentation(undefined)).toEqual({
      label: 'Vehículo',
      icon: 'car-outline',
    });
  });
});
