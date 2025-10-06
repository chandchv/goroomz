import React, { createContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import apiService from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    const initializeAuth = async () => {
      const token = apiService.getToken();
      if (token) {
        try {
          const response = await apiService.getCurrentUser();
          if (response.success) {
            setUser(response.user);
          } else {
            // Invalid token, remove it
            apiService.removeToken();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          apiService.removeToken();
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      if (response.success) {
        setUser(response.user);
        toast({ title: `Welcome back, ${response.user.name}! 👋` });
        return response.user;
      } else {
        toast({
          title: "Login Failed",
          description: response.message || "Invalid email or password.",
          variant: "destructive"
        });
        return null;
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const signup = async (name, email, password) => {
    try {
      const response = await apiService.register({ name, email, password });
      if (response.success) {
        setUser(response.user);
        toast({ title: `Welcome, ${response.user.name}! 🎉 Your account is ready.` });
        return response.user;
      } else {
        toast({
          title: "Signup Failed",
          description: response.message || "An account with this email already exists.",
          variant: "destructive"
        });
        return null;
      }
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      apiService.removeToken();
      toast({ title: "You've been logged out." });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;