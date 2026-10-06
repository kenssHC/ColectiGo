import { useEffect } from 'react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';

/** Suscribe el store global al estado de sesión de Firebase. */
export function useAuthListener(): void {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);
}
