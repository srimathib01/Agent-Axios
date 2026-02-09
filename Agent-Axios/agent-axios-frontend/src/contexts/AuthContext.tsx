import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  login as apiLogin, 
  register as apiRegister, 
  logout as apiLogout,
  getUserProfile,
  setAuthToken,
  getAuthToken,
  type User,
  type LoginRequest,
  type RegisterRequest,
} from '@/services/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth token and load user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      
      if (token) {
        try {
          const response = await getUserProfile();
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            // Invalid token, clear it
            setAuthToken(null);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setAuthToken(null);
        }
      } else {
        // Auto-login with default user for demo/development
        try {
          const response = await apiLogin({
            email: 'admin@agentaxios.com',
            password: 'demo123',
          });
          if (response.success && response.data) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Auto-login failed:', error);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiLogin(credentials);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        toast.success('Login successful', {
          description: `Welcome back, ${response.data.user.firstName}!`,
        });
      }
    } catch (error: any) {
      toast.error('Login failed', {
        description: error.message || 'Invalid credentials',
      });
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await apiRegister(userData);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        toast.success('Registration successful', {
          description: `Welcome, ${response.data.user.firstName}!`,
        });
      }
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.message || 'Failed to create account',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Note: We don't have refresh token stored in this example
      // In production, you'd want to store it securely
      await apiLogout('');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear user state anyway
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await getUserProfile();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
