import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { setAdminPassword } from '../api';
import { verifyPassword, getConfig } from '../api/config';

interface AuthContextType {
  isAuthenticated: boolean;
  passwordRequired: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(true);

  useEffect(() => {
    getConfig().then(config => {
      setPasswordRequired(config.hasAdminPassword);
      if (!config.hasAdminPassword) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const result = await verifyPassword(password);
      if (result.valid) {
        setAdminPassword(password);
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
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, passwordRequired, login, logout }}>
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
