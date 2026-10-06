import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from '@collectigo/shared';
import { HUANCAYO_CENTER } from '../constants/locations';

interface UseLocationResult {
  location: LatLng | null;
  errorMessage: string | null;
  isLoading: boolean;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function requestLocation(): Promise<void> {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (active) {
          setLocation(HUANCAYO_CENTER);
          setErrorMessage('Sin permiso de ubicación: usando el centro de Huancayo como origen');
          setIsLoading(false);
        }
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (active) {
        setLocation({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        });
        setIsLoading(false);
      }
    }

    requestLocation().catch(() => {
      if (active) {
        setLocation(HUANCAYO_CENTER);
        setErrorMessage('No se pudo obtener tu ubicación: usando el centro de Huancayo');
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return { location, errorMessage, isLoading };
}
