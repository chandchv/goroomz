import React, { useState, useEffect } from 'react';
import superuserService, { type PropertyOwner, type GeneratedCredentials } from '../services/superuserService';

interface PropertyOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOwner: PropertyOwner | null;
}

const PropertyOwnerModal: React.FC<PropertyOwnerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingOwner,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyName: '',
    propertyType: 'Hotel' as 'Hotel' | 'PG',
    propertyAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (editingOwner) {
      setFormData({
        name: editingOwner.name,
        email: editingOwner.email,
        phone: editingOwner.phone || '',
        propertyName: '',
        propertyType: 'Hotel',
        propertyAddress: '',
      });
      setGeneratedCredentials(null);
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        propertyName: '',
        propertyType: 'Hotel',
        propertyAddress: '',
      });
      setGeneratedCredentials(null);
    }
    setError(null);
  }, [editingOwner, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateCredentials = () => {
    // Generate a random password
    const password = generateRandomPassword();
    const loginUrl = window.location.origin + '/login';
    
    setGeneratedCredentials({
      email: formData.email,
      password,
      loginUrl,
    });
  };

  const generateRandomPassword = (): string => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleSendEmail = async (ownerId: string) => {
    if (!generatedCredentials) return;

    try {
      setSendingEmail(true);
      await superuserService.sendCredentialsEmail(ownerId, generatedCredentials);
      alert('Credentials sent successfully via email!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send credentials email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!editingOwner && !formData.propertyName.trim()) {
      setError('Property name is required for new owners');
      return;
    }

    try {
      setLoading(true);

      if (editingOwner) {
        // Update existing owner
        await superuserService.updatePropertyOwner(editingOwner.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
        });
        onSuccess();
      } else {
        // Create new owner
        const result = await superuserService.createPropertyOwner(formData);
        setGeneratedCredentials(result.credentials);
        
        // Show success message with option to send email
        alert('Property owner created successfully! Credentials have been generated.');
        
        // Optionally send email automatically
        if (window.confirm('Would you like to send the credentials via email now?')) {
          await handleSendEmail(result.owner.id);
        }
        
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save property owner');
      console.error('Error saving property owner:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!generatedCredentials) return;
    
    const text = `Login Credentials for GoRoomz Internal Management
Email: ${generatedCredentials.email}
Password: ${generatedCredentials.password}
Login URL: ${generatedCredentials.loginUrl}`;
    
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingOwner ? 'Edit Property Owner' : 'Add New Property Owner'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Owner Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Owner Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  disabled={!!editingOwner}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Property Details (only for new owners) */}
          {!editingOwner && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="propertyName"
                    value={formData.propertyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="Hotel">Hotel (Daily Basis)</option>
                    <option value="PG">PG (Monthly Basis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address
                  </label>
                  <textarea
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Credentials Section */}
          {!editingOwner && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Login Credentials</h3>
              
              {!generatedCredentials ? (
                <button
                  type="button"
                  onClick={handleGenerateCredentials}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Generate Credentials
                </button>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-2 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{generatedCredentials.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Password:</span>
                      <span className="ml-2 text-sm text-gray-900 font-mono">{generatedCredentials.password}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Login URL:</span>
                      <span className="ml-2 text-sm text-blue-600">{generatedCredentials.loginUrl}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  
                  <p className="mt-3 text-xs text-gray-600">
                    Note: Make sure to save these credentials. They will be sent via email after creation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Saving...' : editingOwner ? 'Update Owner' : 'Create Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyOwnerModal;
