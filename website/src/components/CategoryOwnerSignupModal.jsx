import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Building, User, Mail, Phone, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import apiService from '@/services/api';

const CategoryOwnerSignupModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone
    if (!/^[0-9]{10,15}$/.test(formData.phone)) {
      toast({ title: "Invalid Phone Number", description: "Please enter a valid phone number (10-15 digits).", variant: "destructive" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.post('/users/owner-signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone
      }, { includeAuth: false });

      if (response.success) {
        // Auto-login: store token so session restore picks it up
        if (response.token) {
          apiService.setToken(response.token);
          localStorage.setItem('userEmail', formData.email);
          localStorage.setItem('goroomz_auth_provider', 'local');
        }

        toast({
          title: "Account Created! 🎉",
          description: "You're now a property owner. Redirecting to your dashboard...",
        });

        setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
        if (onSuccess) onSuccess(response.data);
        onClose();

        // Reload to trigger session restore with the new token
        setTimeout(() => {
          window.location.href = '/owner/dashboard';
        }, 800);
      }
    } catch (error) {
      let errorMessage = "Failed to create account. Please try again.";
      if (error.message?.includes('already exists')) {
        errorMessage = "An account with this email already exists. Please log in instead.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">List Your Property</h2>
                <p className="text-sm text-gray-500">Create a free owner account</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange}
                  placeholder="Your full name" className="pl-10" autoComplete="name" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange}
                  placeholder="you@example.com" className="pl-10" autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange}
                  placeholder="10-digit mobile number" className="pl-10" autoComplete="tel" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleInputChange}
                  placeholder="Min 6 characters" className="pl-10 pr-10" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword} onChange={handleInputChange}
                  placeholder="Re-enter password" className="pl-10 pr-10" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 mt-2" disabled={isLoading}>
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Creating Account...</>
              ) : (
                <><Building className="w-4 h-4 mr-2" /> Create Owner Account</>
              )}
            </Button>
          </form>

          {/* Info box */}
          <div className="mt-5 p-4 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-sm font-semibold text-green-800 mb-2">What happens next:</p>
            <ul className="text-xs text-green-700 space-y-1.5">
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Your account is created instantly</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Add your property details from the dashboard</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Our team reviews and approves your listing</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Start receiving tenant enquiries</li>
            </ul>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <button onClick={() => { onClose(); navigate('/login'); }} className="text-purple-600 font-medium hover:underline">
              Log in
            </button>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CategoryOwnerSignupModal;
