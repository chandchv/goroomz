import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const defaultFormState = {
  name: '',
  phone: '',
  dob: '',
  location: '',
  country: '',
  state: '',
  city: '',
  landmark: '',
  address: '',
  pincode: '',
};

const ProfilePage = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const hasRefreshedRef = useRef(false);

  // Refresh user data when user becomes available (first time only)
  useEffect(() => {
    const loadUserData = async () => {
      if (user && !hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        setIsLoading(true);
        try {
          console.log('ProfilePage: Refreshing user data...');
          const refreshedUser = await refreshUser();
          console.log('ProfilePage: User data refreshed:', refreshedUser);
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadUserData();
  }, [user, refreshUser]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        dob: user.dob || '',
        location: user.location || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        landmark: user.landmark || '',
        address: user.address || '',
        pincode: user.pincode || '',
      });
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      (formData.name || '') !== (user.name || '') ||
      (formData.phone || '') !== (user.phone || '') ||
      (formData.dob || '') !== (user.dob || '') ||
      (formData.location || '') !== (user.location || '') ||
      (formData.country || '') !== (user.country || '') ||
      (formData.state || '') !== (user.state || '') ||
      (formData.city || '') !== (user.city || '') ||
      (formData.landmark || '') !== (user.landmark || '') ||
      (formData.address || '') !== (user.address || '') ||
      (formData.pincode || '') !== (user.pincode || '')
    );
  }, [formData, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !isDirty) return;

    setIsSubmitting(true);
    try {
      await updateProfile({
        name: formData.name?.trim() || '',
        phone: formData.phone?.trim() || '',
        dob: formData.dob || null,
        location: formData.location?.trim() || '',
        country: formData.country?.trim() || '',
        state: formData.state?.trim() || '',
        city: formData.city?.trim() || '',
        landmark: formData.landmark?.trim() || '',
        address: formData.address?.trim() || '',
        pincode: formData.pincode?.trim() || '',
      });
      // Refresh user data after successful update
      await refreshUser();
      // Exit edit mode after successful save
      setIsEditMode(false);
    } catch (error) {
      // Error toast is handled within updateProfile
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelClick = () => {
    // Reset form data to current user data
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        dob: user.dob || '',
        location: user.location || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        landmark: user.landmark || '',
        address: user.address || '',
        pincode: user.pincode || '',
      });
    }
    setIsEditMode(false);
  };

  const handleUseCurrentLocation = () => {
    if (!isEditMode) return;

    if (!navigator?.geolocation) {
      setLocationStatus('Geolocation is not supported in this browser.');
      return;
    }

    setIsFetchingLocation(true);
    setLocationStatus('Fetching your current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const formattedLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData((prev) => ({ ...prev, location: formattedLocation }));
        setLocationStatus('Location captured from your device.');
        setIsFetchingLocation(false);
      },
      (error) => {
        setLocationStatus(error.message || 'Unable to fetch your location.');
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>My Profile - GoRoomz</title>
        <meta name="description" content="Update your GoRoomz profile information." />
      </Helmet>
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto glass-effect p-8 rounded-2xl shadow-2xl"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">My Profile</h1>
              <p className="text-muted-foreground mt-2">
                {isEditMode 
                  ? 'Update your personal information below.'
                  : 'Keep your personal information up to date to make bookings faster and easier.'}
              </p>
            </div>
            {!isEditMode && (
              <Button
                type="button"
                onClick={handleEditClick}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                Edit Profile
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your mobile number"
                  autoComplete="tel"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={formData.dob || ''}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter your country"
                  autoComplete="country"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter your state"
                  autoComplete="state"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter your city"
                  autoComplete="city"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="Enter your landmark"
                  autoComplete="landmark"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="location">Location</Label>
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCurrentLocation}
                      disabled={isFetchingLocation}
                    >
                      {isFetchingLocation ? 'Locating...' : 'Use Current Location'}
                    </Button>
                  )}
                </div>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City / State or coordinates"
                  autoComplete="address-level2"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
                {locationStatus && (
                  <p className="text-xs text-muted-foreground">{locationStatus}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="House number, street, area"
                rows={4}
                disabled={!isEditMode}
                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${!isEditMode ? "bg-muted cursor-not-allowed" : ""}`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Enter your pincode"
                  autoComplete="postal-code"
                  disabled={!isEditMode}
                  className={!isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  value={user.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email updates are managed by our support team for security reasons.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Your details stay private and are used only for booking assistance.
              </p>
              {isEditMode && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelClick}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    disabled={isSubmitting || !isDirty}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default ProfilePage;

