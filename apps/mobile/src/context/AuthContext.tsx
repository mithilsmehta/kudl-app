import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Customer,
  DeleteAccountResult,
  ProfileUpdate,
  deleteCustomerAccount,
  getCurrentCustomer,
  getStoredToken,
  loginCustomer,
  registerCustomer,
  setStoredToken,
  updateCustomerProfile,
} from '../services/api';

interface AuthContextType {
  user: Customer | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (details: { email: string; password: string; first_name?: string; last_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Saves the editable profile fields and puts the result straight into state. */
  updateProfile: (details: ProfileUpdate) => Promise<Customer>;
  /**
   * Deletes the account server-side and then signs out locally. Both halves
   * belong together: the stored token still parses after the customer row is
   * gone, so leaving it behind would keep the app in a "logged in" state where
   * every authenticated request fails.
   */
  deleteAccount: (password: string) => Promise<DeleteAccountResult>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateProfile: async () => {
    throw new Error('AuthProvider is missing');
  },
  deleteAccount: async () => {
    throw new Error('AuthProvider is missing');
  },
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

  /*
   * No isLoading toggle here, unlike login/register. Those gate the whole app on
   * a splash state; this is a form submit on a settings screen, and flipping the
   * global flag would unmount the screen the customer is still looking at.
   */
  const updateProfile = async (details: ProfileUpdate) => {
    const updated = await updateCustomerProfile(details);
    setUser(updated);
    return updated;
  };

  const deleteAccount = async (password: string) => {
    const result = await deleteCustomerAccount(password);
    await logout();
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
