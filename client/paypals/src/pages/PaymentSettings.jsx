import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Notification from "../components/Notification";
import { useNotification } from "../hooks/useNotification";

const PaymentSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState({
    paynow_phone: '',
    paynow_enabled: false
  });

  // Notification hook
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/users/payment-methods', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods({
          paynow_phone: data.data.paynow_phone || '',
          paynow_enabled: data.data.paynow_enabled || false
        });
      } else if (response.status === 401) {
        navigate('/login');
        return;
      } else {
        throw new Error('Failed to load payment methods');
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      showNotification('Failed to load payment methods. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentMethods(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (paymentMethods.paynow_enabled) {
      if (!paymentMethods.paynow_phone) {
        errors.push('Please provide a PayNow phone number to enable PayNow');
      }

      if (paymentMethods.paynow_phone) {
        const phoneRegex = /^(\+65)?[89]\d{7}$/;
        const cleanPhone = paymentMethods.paynow_phone.replace(/\s+/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          errors.push('Invalid Singapore phone number format. Use +6591234567 or 91234567');
        }
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      showNotification(errors[0], 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('http://localhost:3000/api/users/payment-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(paymentMethods)
      });

      if (response.ok) {
        showNotification('Payment methods updated successfully!', 'success');
      } else if (response.status === 401) {
        navigate('/login');
        return;
      } else if (response.status === 409) {
        // Handle unique constraint violations (duplicate PayNow details)
        const errorData = await response.json();
        const errorMessage = errorData.message || 'This PayNow information is already in use';
        
        // Show specific error message for duplicate PayNow details
        if (errorMessage.includes('phone number')) {
          showNotification('❌ This PayNow phone number is already registered by another user. Please use a different phone number.', 'error');
        } else {
          showNotification(`❌ ${errorMessage}`, 'error');
        }
        return;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update payment methods');
      }
    } catch (error) {
      console.error('Error updating payment methods:', error);
      
      // Don't show generic error if we already handled a 409 conflict
      if (error.message && !error.message.includes('Failed to fetch')) {
        showNotification(error.message || 'Failed to update payment methods. Please try again.', 'error');
      } else {
        showNotification('Failed to update payment methods. Please check your connection and try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('65')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    } else if (cleaned.length === 8) {
      return `+65 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="space-y-4">
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
                <p className="mt-2 text-gray-600">
                  Manage your PayNow settings for receiving payments
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* PayNow Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Enable PayNow</h3>
                <p className="text-sm text-gray-600">
                  Allow others to pay you using Singapore's PayNow system with your phone number
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="paynow_enabled"
                  checked={paymentMethods.paynow_enabled}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* PayNow Phone Number */}
            <div>
              <label htmlFor="paynow_phone" className="block text-sm font-medium text-gray-700 mb-2">
                PayNow Phone Number
              </label>
              <input
                type="tel"
                id="paynow_phone"
                name="paynow_phone"
                value={paymentMethods.paynow_phone}
                onChange={handleInputChange}
                placeholder="+65 8123 4567 or 81234567"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={!paymentMethods.paynow_enabled}
              />
              <p className="mt-2 text-sm text-gray-500">
                Singapore mobile number registered with PayNow
              </p>
            </div>

            {/* Help Text */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Important Information
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>You need at least one PayNow identifier (phone number) to enable PayNow</li>
                      <li>Make sure your phone number is registered with PayNow in your bank app</li>
                      <li>Others will be able to pay you directly using this PayNow identifier</li>
                      <li>Keep your information up to date for seamless transactions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            {paymentMethods.paynow_enabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">PayNow Status: Active</h3>
                <div className="text-sm text-green-700">
                  {paymentMethods.paynow_phone && (
                    <p>📱 Phone: {formatPhoneNumber(paymentMethods.paynow_phone)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notification */}
      {notification.message && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={hideNotification} 
        />
      )}
    </div>
  );
};

export default PaymentSettings;