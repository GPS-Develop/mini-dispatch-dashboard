'use client';

import { useState } from 'react';
import Button from './Button/Button';
import { sanitizePhone } from '@/utils/validation';

interface CreateDriverAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDriverAccountModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateDriverAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    payRate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.payRate.trim()) {
        setError('All fields are required');
        return;
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Validate phone
      const sanitizedPhone = sanitizePhone(formData.phone);
      if (!sanitizedPhone || sanitizedPhone.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }

      // Validate pay rate
      const payRate = parseFloat(formData.payRate);
      if (isNaN(payRate) || payRate <= 0) {
        setError('Pay rate must be a positive number');
        return;
      }

      // Create driver account
      const response = await fetch('/api/drivers/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: sanitizedPhone,
          payRate: payRate
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create driver account');
        return;
      }

      setSuccess('Driver account created successfully! Invitation email sent.');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        payRate: ''
      });

      // Close modal and refresh parent component after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess('');
      }, 2000);

    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        payRate: ''
      });
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create Driver Account</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="john@example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Driver will receive an invitation email to set up their account
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div>
            <label htmlFor="payRate" className="block text-sm font-medium text-gray-700 mb-1">
              Pay Rate ($) *
            </label>
            <input
              type="number"
              id="payRate"
              name="payRate"
              value={formData.payRate}
              onChange={handleChange}
              disabled={loading}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="0.55"
              required
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700 text-xs">
            <strong>How it works:</strong> The driver will receive an email invitation with a secure link to access their account. They can then log in and view their assigned loads on the mobile driver dashboard.
          </p>
        </div>
      </div>
    </div>
  );
} 