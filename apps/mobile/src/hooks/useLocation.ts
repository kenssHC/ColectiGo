import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from '@collectigo/shared';
import { HUANCAYO_CENTER } from '../constants/locations';

interface UseLocationResult {
  location: LatLng | null;
  errorMessage: string | null;
  isLoading: boolean;
  isFallback: boolean;
  errorKind: 'permission' | 'unavailable' | null;
  retry: () => void;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [errorKind, setErrorKind] = useState<'permission' | 'unavailable' | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    async function requestLocation(): Promise<void> {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (active) {
          setLocation(HUANCAYO_CENTER);
          setIsFallback(true);
          setErrorKind('permission');
          setErrorMessage(
            'No tenemos acceso a tu ubicación. Elige el origen directamente en el mapa.',
          );
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
        setIsFallback(false);
        setErrorKind(null);
        setErrorMessage(null);
        setIsLoading(false);
      }
    }

    requestLocation().catch(() => {
      if (active) {
        setLocation(HUANCAYO_CENTER);
        setIsFallback(true);
        setErrorKind('unavailable');
        setErrorMessage(
          'No pudimos obtener tu ubicación. Elige el origen directamente en el mapa.',
        );
        setIsLoading(false);
      }
    });

    return (): void => {
      active = false;
    };
  }, [requestVersion]);

  return {
    location,
    errorMessage,
    isLoading,
    isFallback,
    errorKind,
    retry: (): void => {
      setIsLoading(true);
      setErrorMessage(null);
      setErrorKind(null);
      setRequestVersion((value) => value + 1);
    },
  };
}
