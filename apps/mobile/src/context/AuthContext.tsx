import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, getCurrentCustomer, getStoredToken, loginCustomer, registerCustomer, setStoredToken } from '../services/api';

interface AuthContextType {
  user: Customer | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (details: { email: string; password: string; first_name?: string; last_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const storedToken = await getStoredToken();
      setToken(storedToken);
      if (storedToken) {
        const customer = await getCurrentCustomer();
        setUser(customer);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await loginCustomer(email, pass);
      setToken(res.token);
      const customer = await getCurrentCustomer();
      setUser(customer);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (details: { email: string; password: string; first_name?: string; last_name?: string }) => {
    setIsLoading(true);
    try {
      const res = await registerCustomer(details);
      if (res.token) setToken(res.token);
      setUser(res.customer);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
