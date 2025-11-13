import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import UserDetailsModal from './UserDetailsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const OtpLogin = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const { setupRecaptcha, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // The recaptcha container is now persistent in LoginPage.jsx
    // We just need to ensure the verifier is set up once.
    if (!window.recaptchaVerifier) {
      setupRecaptcha('recaptcha-container');
    }
    // The verifier might take a moment to be ready, especially on first load.
    const timer = setTimeout(() => setIsRecaptchaReady(true), 1000);
    return () => clearTimeout(timer);
  }, [setupRecaptcha]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    const result = await sendOtp(phoneNumber);
    if (result) {
      setIsOtpSent(true);
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast({
        title: "Missing Information",
        description: "Please enter the OTP.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    const user = await verifyOtp(otp);
    if (user) {
      setVerifiedUser(user);
      setShowDetailsModal(true);
    }
    setIsLoading(false);
  };

  return (
    <>
      {showDetailsModal && (
        <UserDetailsModal 
          user={verifiedUser} 
          onClose={() => {
            setShowDetailsModal(false);
            navigate('/');
          }} 
        />
      )}
      <div className="space-y-6">
        {!isOtpSent ? (
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="+1 123-456-7890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-6 text-lg"
            disabled={isLoading || !isRecaptchaReady}
          >
            {isLoading ? 'Sending OTP...' : (isRecaptchaReady ? 'Send OTP' : 'Initializing...')}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-6 text-lg"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>
      )}
      </div>
    </>
  );
};

export default OtpLogin;
