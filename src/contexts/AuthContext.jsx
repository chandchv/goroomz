import React, { createContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { auth } from '@/firebase';
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import apiService from '@/services/api';

const AuthContext = createContext(null);

const AUTH_PROVIDER_KEY = 'goroomz_auth_provider';

const setAuthProvider = (provider) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_PROVIDER_KEY, provider);
};

const getAuthProvider = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_PROVIDER_KEY);
};

const clearAuthProvider = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_PROVIDER_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Restore backend-authenticated session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedProvider = getAuthProvider();
      const hasToken = !!apiService.getToken();

      if (storedProvider === 'local' && hasToken) {
        try {
          const response = await apiService.getCurrentUser();
          if (response.success) {
            setUser(response.user);
          } else {
            throw new Error(response.message || 'Failed to restore session');
          }
        } catch (error) {
          console.error('Backend session restore failed:', error);
          apiService.removeToken();
          clearAuthProvider();
          setUser(null);
        }
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const response = await apiService.post('/users/firebase-signin', { token });

          if (response?.success) {
            const { user: backendUser, token: backendToken } = response;
            setUser(backendUser);
            apiService.setToken(backendToken);
            setAuthProvider('firebase');
          } else {
            throw new Error(response?.message || 'Backend session restore failed');
          }
        } catch (error) {
          console.error("Session restore error:", error);
          // If session restore fails, sign the user out to clear state
          await signOut(auth);
          if (getAuthProvider() === 'firebase') {
            apiService.removeToken();
            clearAuthProvider();
          }
          setUser(null);
        }
      } else {
        // Only clear backend session if it originated from a Firebase login
        if (getAuthProvider() === 'firebase') {
          setUser(null);
          apiService.removeToken();
          clearAuthProvider();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);

      if (response.success) {
        setUser(response.user);
        setAuthProvider('local');
        toast({ title: `Welcome back! 👋` });
        return response.user;
      }

      throw new Error(response.message || 'Invalid email or password.');
    } catch (error) {
      console.error('Backend login failed:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive"
      });
      return null;
    }
  };

  const signup = async (name, email, password) => {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase user's display name
      if (name) {
        await updateProfile(firebaseUser, { displayName: name });
        // Force token refresh to include the updated displayName
        await firebaseUser.getIdToken(true);
      }

      // Get the ID token and sync with backend
      // The backend will fetch the displayName from Firebase Admin
      const token = await firebaseUser.getIdToken();
      const response = await apiService.post('/users/firebase-signin', { token });

      if (response?.success) {
        const { user: backendUser, token: backendToken } = response;
        setUser(backendUser);
        apiService.setToken(backendToken);
        setAuthProvider('firebase');
        toast({ title: `Welcome, ${backendUser.name || name}! 🎉 Your account is ready.` });
        return backendUser;
      } else {
        throw new Error(response?.message || 'Backend signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Provide more specific error messages
      let errorMessage = "An error occurred during signup.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "The email address is invalid.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/password authentication is not enabled in Firebase Console. Please enable it in Authentication → Sign-in method.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please use a stronger password (at least 6 characters).";
      } else if (error.code === 'auth/invalid-api-key') {
        errorMessage = "Firebase configuration error. Please check your API key.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const token = await firebaseUser.getIdToken();

      const response = await apiService.post('/users/firebase-signin', { token });

      if (response?.success) {
        const { user: backendUser, token: backendToken } = response;
        setUser(backendUser);
        apiService.setToken(backendToken);
        setAuthProvider('firebase');
        toast({ title: `Welcome, ${backendUser.name}! 🎉` });
        return backendUser;
      } else {
        throw new Error(response?.message || 'Backend Google sign-in failed');
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
      toast({
        title: "Google Sign-In Failed",
        description: error.response?.data?.message || error.message || "Could not sign in with Google. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const logout = async () => {
    try {
      const provider = getAuthProvider();
      if (provider === 'firebase') {
        await signOut(auth);
      }
      await apiService.logout();
      clearAuthProvider();
      setUser(null);
      toast({ title: "You've been logged out." });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const setupRecaptcha = (containerId) => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        console.log("Recaptcha verified");
      }
    });
  };

  const sendOtp = async (phoneNumber) => {
    const appVerifier = window.recaptchaVerifier;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      toast({ title: "OTP Sent!", description: "Check your phone for the verification code." });
      return confirmationResult;
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Failed to Send OTP",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const verifyOtp = async (otp) => {
    try {
      const result = await window.confirmationResult.confirm(otp);
      const firebaseUser = result.user;
      const token = await firebaseUser.getIdToken();

      const response = await apiService.post('/users/firebase-signin', { token });

      if (response?.success) {
        const { user: backendUser, token: backendToken } = response;
        setUser(backendUser);
        apiService.setToken(backendToken);
        setAuthProvider('firebase');
        toast({ title: "Phone number verified successfully!" });
        return backendUser;
      } else {
        throw new Error(response?.message || 'Backend phone sign-in failed');
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Invalid OTP",
        description: "The OTP you entered is incorrect. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateUserProfile = async (firebaseUser, { name, email, password, location }) => {
    try {
      // Only update email in Firebase if the user already has an email provider
      if (email && firebaseUser.providerData.some(p => p.providerId === 'password')) {
        await updateEmail(firebaseUser, email);
      }
      if (password) {
        await updatePassword(firebaseUser, password);
      }
      // Now update the backend
      const response = await apiService.updateProfile({
        name,
        email,
        location,
        firebase_uid: firebaseUser.uid
      });

      if (response.success) {
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Backend update failed');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      // Re-throw the error to be caught by the component
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, signInWithGoogle, setupRecaptcha, sendOtp, verifyOtp, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
