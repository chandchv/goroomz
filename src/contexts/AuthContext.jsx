import React, { createContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { auth } from '@/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import apiService from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const response = await apiService.post('/users/firebase-signin', { token });

          if (response.data.success) {
            const { user: backendUser, token: backendToken } = response.data;
            setUser(backendUser);
            apiService.setToken(backendToken);
          } else {
            throw new Error(response.data.message || 'Backend session restore failed');
          }
        } catch (error) {
          console.error("Session restore error:", error);
          // If session restore fails, sign the user out to clear state
          await signOut(auth);
          setUser(null);
          apiService.removeToken();
        }
      } else {
        // User is signed out
        setUser(null);
        apiService.removeToken();
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast({ title: `Welcome back! 👋` });
      return userCredential.user;
    } catch (error) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Here you would typically call your backend to create a user profile with the name
      // For now, we'll just show a success message
      toast({ title: `Welcome! 🎉 Your account is ready.` });
      return userCredential.user;
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: error.message || "An account with this email already exists.",
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

      if (response.data.success) {
        const { user: backendUser, token: backendToken } = response.data;
        setUser(backendUser);
        apiService.setToken(backendToken);
        toast({ title: `Welcome, ${backendUser.name}! 🎉` });
        return backendUser;
      } else {
        throw new Error(response.data.message || 'Backend Google sign-in failed');
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
      await signOut(auth);
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

      if (response.data.success) {
        const { user: backendUser, token: backendToken } = response.data;
        setUser(backendUser);
        apiService.setToken(backendToken);
        toast({ title: "Phone number verified successfully!" });
        return backendUser;
      } else {
        throw new Error(response.data.message || 'Backend phone sign-in failed');
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
