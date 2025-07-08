'use client';

import { useState } from 'react';
import Button from './Button/Button';
import { sanitizePhone, validateDriverPayRate } from '@/utils/validation';

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
      const payRateValidation = validateDriverPayRate(formData.payRate);
      if (!payRateValidation.isValid) {
        setError(payRateValidation.error || 'Invalid pay rate');
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
          payRate: payRateValidation.sanitizedValue
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
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="heading-lg">Create Driver Account</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="modal-close-btn"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="form-container">
            <div className="edit-form-section">
              <label htmlFor="name" className="label-text">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                className="input-field"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="edit-form-section">
              <label htmlFor="email" className="label-text">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className="input-field"
                placeholder="john@example.com"
                required
              />
              <p className="text-hint">
                Driver will receive an invitation email to set up their account
              </p>
            </div>

            <div className="edit-form-section">
              <label htmlFor="phone" className="label-text">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                className="input-field"
                placeholder="(555) 123-4567"
                required
              />
            </div>

            <div className="edit-form-section">
              <label htmlFor="payRate" className="label-text">
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
                className="input-field"
                placeholder="0.55"
                required
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="alert-error">
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="alert-success">
                <p>{success}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="button-group-horizontal">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>

          {/* Info */}
          <div className="modal-info">
            <p className="text-hint">
              <strong>How it works:</strong> The driver will receive an email invitation with a secure link to access their account. They can then log in and view their assigned loads on the mobile driver dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 