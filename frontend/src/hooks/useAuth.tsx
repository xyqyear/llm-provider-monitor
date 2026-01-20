import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import {
  setAdminPassword,
  getStoredAdminPassword,
  setStoredAdminPassword,
  clearStoredAdminPassword,
  onAdminAuthInvalid,
} from '../api';
import { verifyPassword, getConfig } from '../api/config';

interface AuthContextType {
  isAuthenticated: boolean;
  passwordRequired: boolean;
  isInitializing: boolean;
  login: (password: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getStoredAdminPassword()));
  const [passwordRequired, setPasswordRequired] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let ignore = false;
    const initializeAuth = async () => {
      try {
        const config = await getConfig();
        if (ignore) {
          return;
        }
        setPasswordRequired(config.hasAdminPassword);
        if (!config.hasAdminPassword) {
          clearStoredAdminPassword();
          setAdminPassword(null);
          setIsAuthenticated(true);
          setIsInitializing(false);
          return;
        }

        const cachedPassword = getStoredAdminPassword();
        if (cachedPassword) {
          setAdminPassword(cachedPassword);
          setIsAuthenticated(true);
        } else {
          setAdminPassword(null);
          setIsAuthenticated(false);
        }
        setIsInitializing(false);
      } catch {
        if (!ignore) {
          setIsAuthenticated(false);
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    return onAdminAuthInvalid(() => {
      setIsAuthenticated(false);
      setPasswordRequired(true);
    });
  }, []);

  const login = useCallback(async (password: string, remember: boolean): Promise<boolean> => {
    try {
      const result = await verifyPassword(password);
      if (result.valid) {
        setAdminPassword(password);
        if (remember) {
          setStoredAdminPassword(password);
        } else {
          clearStoredAdminPassword();
        }
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setAdminPassword(null);
    clearStoredAdminPassword();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, passwordRequired, isInitializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
