import { shouldEnableTestAds } from '../ads.config';

describe('ads config', () => {
  test('bloquea anuncios en producción aunque se soliciten', () => {
    expect(shouldEnableTestAds('production', 'true')).toBe(false);
  });

  test('solo habilita anuncios de prueba cuando se solicitan fuera de producción', () => {
    expect(shouldEnableTestAds('development', 'true')).toBe(true);
    expect(shouldEnableTestAds('preview', 'true')).toBe(true);
    expect(shouldEnableTestAds('development', 'false')).toBe(false);
    expect(shouldEnableTestAds('preview', undefined)).toBe(false);
  });
});
