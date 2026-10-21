import { authenticatedDestination, parseAuthReturnPath } from '../auth-navigation';

describe('auth navigation', () => {
  test('conserva un destino protegido conocido después del login', () => {
    const returnTo = parseAuthReturnPath('/profile/new-suggestion');

    expect(authenticatedDestination(returnTo)).toBe('/profile/new-suggestion');
  });

  test('descarta destinos externos o desconocidos', () => {
    expect(parseAuthReturnPath('https://example.com')).toBeNull();
    expect(parseAuthReturnPath('//example.com')).toBeNull();
    expect(parseAuthReturnPath('/admin')).toBeNull();
  });

  test('usa el mapa cuando no existe un destino pendiente', () => {
    expect(authenticatedDestination(null)).toBe('/(tabs)/map');
  });
});
