import { useEffect, useRef, useState } from 'react';
import keycloak from '@/lib/keycloak';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '../api/auth-api';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const isRun = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { setToken, setSystemRoles } = useAuthStore();
  
  // MODO MOCK: Bypass de autenticación para desarrollo local
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

  useEffect(() => {
    if (useMockAuth) {
        console.warn('⚠️ MOCK AUTH ENABLED: Skipping Keycloak login');
        setToken('mock-token-12345');
        setSystemRoles([{ type: 'SYSTEM', role: 'SUPERADMIN', resourceId: null }]); // Mock SuperAdmin
        // Usar setTimeout para evitar update síncrono durante render
        setTimeout(() => setIsInitialized(true), 0);
        return;
    }

    if (isRun.current) return;
    isRun.current = true;

    keycloak
      .init({
        onLoad: 'login-required',
        checkLoginIframe: false,
      })
      .then(async (authenticated) => {
        if (authenticated) {
          setToken(keycloak.token || null);
          
          // Fetch System Roles
          try {
            const response = await authApi.getMySystemRoles();
            if (response && Array.isArray(response.roles)) {
                setSystemRoles(response.roles);
            }
          } catch (e) {
            console.error("Failed to fetch system roles", e);
          }

          setInterval(() => {
            keycloak
              .updateToken(70)
              .then((refreshed) => {
                if (refreshed) {
                  setToken(keycloak.token || null);
                }
              })
              .catch(() => {
                console.error('Failed to refresh token');
                keycloak.logout();
              });
          }, 60000);
        }
        setIsInitialized(true);
      })
      .catch((err) => {
        console.error('Keycloak init failed', err);
        // En caso de error crítico, podríamos mostrar un error en UI
        setIsInitialized(true); 
      });
  }, [setToken, setSystemRoles, useMockAuth]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
};
