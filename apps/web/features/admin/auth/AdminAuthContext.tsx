'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentAdmin, loginAdmin } from '@/features/admin/api';
import { AdminUser } from '@/features/admin/auth/types';
import { recordOperationEvent } from '@/features/admin/operations';
import { clearAdminTokenCookie, readAdminTokenCookie, storeAdminTokenCookie } from '@/features/admin/auth/actions';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type LoginResult = {
  success: boolean;
  message: string;
};

type AdminAuthContextValue = {
  status: AuthStatus;
  admin: AdminUser | null;
  token: string | null;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  clearSession: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const clearSession = useCallback(() => {
    void clearAdminTokenCookie();
    setToken(null);
    setAdmin(null);
    setStatus('unauthenticated');
  }, []);

  const restoreSession = useCallback(async (storedToken: string) => {
    try {
      const currentAdmin = await fetchCurrentAdmin(storedToken);
      setToken(storedToken);
      setAdmin(currentAdmin);
      setStatus('authenticated');
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    async function loadToken() {
      const storedToken = await readAdminTokenCookie();

      if (!storedToken) {
        setStatus('unauthenticated');
        return;
      }

      void restoreSession(storedToken);
    }
    
    void loadToken();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setIsLoggingIn(true);

    try {
      const loginResult = await loginAdmin(email, password);
      if (!loginResult.success) {
        return {
          success: false,
          message: loginResult.message || 'Invalid email or password.',
        };
      }

      const accessToken = loginResult.access_token;
      if (!accessToken) {
        return {
          success: false,
          message: 'Login response did not include an access token.',
        };
      }

      await storeAdminTokenCookie(accessToken);

      try {
        const currentAdmin = await fetchCurrentAdmin(accessToken);
        setToken(accessToken);
        setAdmin(currentAdmin);
        setStatus('authenticated');
        recordOperationEvent({
          actionType: 'admin_login',
          operatorIdentity: currentAdmin.email,
          result: 'success',
          detail: 'Admin authenticated and session profile restored.',
        });
      } catch (error) {
        clearSession();
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Login succeeded but profile loading failed. Please try again.',
        };
      }

      return { success: true, message: loginResult.message || 'Login successful.' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred during login. Please try again.',
      };
    } finally {
      setIsLoggingIn(false);
    }
  }, [clearSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      status,
      admin,
      token,
      isLoggingIn,
      login,
      logout,
      clearSession,
    }),
    [status, admin, token, isLoggingIn, login, logout, clearSession]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider.');
  }

  return context;
}
