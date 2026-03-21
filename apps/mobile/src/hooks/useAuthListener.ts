import { useEffect } from 'react';
import { localAuthService } from '../services/local-auth.service';
import { useAuthStore } from '../stores/auth.store';

export function useAuthListener(): void {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

    async function checkPersistedSession(): Promise<void> {
      const user = await localAuthService.getCurrentUser();
      if (active) {
        setUser(user);
        setLoading(false);
      }
    }

    checkPersistedSession();

    return () => {
      active = false;
    };
  }, [setUser, setLoading]);
}
