'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Broker } from '../../types';
import { searchBrokers, createBroker, updateBroker } from '../../utils/brokerUtils';
import { createClient } from '../../utils/supabase/client';
import { sanitizePhone } from '../../utils/validation';

interface BrokerAutocompleteProps {
  value: string;
  email: string;
  contact: string;
  onChange: (field: 'brokerName' | 'brokerEmail' | 'brokerContact', value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  error?: string;
}

export default function BrokerAutocomplete({ 
  value, 
  email,
  contact,
  onChange, 
  onBlur, 
  className = 'input-field',
  placeholder = 'Enter broker company name',
  error 
}: BrokerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Broker[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingBroker, setSavingBroker] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [editingBroker, setEditingBroker] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', contact: '' });
  const [updatingBroker, setUpdatingBroker] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({ name: '', email: '', contact: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Search function
  const searchFunction = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowSaveButton(false);
      return;
    }

    setLoading(true);
    const result = await searchBrokers(supabase, searchTerm);
    
    if (result.success && result.data) {
      setSuggestions(result.data);
      setShowSuggestions(result.data.length > 0);
      
      // Show save button if no exact match found
      const exactMatch = result.data.find(broker => 
        broker.name.toLowerCase() === searchTerm.toLowerCase()
      );
      setShowSaveButton(!exactMatch && searchTerm.length > 0);
    }
    setLoading(false);
  }, [supabase]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchFunction(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [value, searchFunction]);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBroker = (broker: Broker) => {
    onChange('brokerName', broker.name);
    onChange('brokerEmail', broker.email || '');
    onChange('brokerContact', broker.contact ? broker.contact.toString() : '');
    setShowSuggestions(false);
    setShowSaveButton(false);
  };

  const handleSaveBroker = async () => {
    if (!value.trim()) return;

    setSavingBroker(true);
    
    const brokerData: { name: string; email?: string; contact?: number } = {
      name: value.trim()
    };

    if (email.trim()) {
      brokerData.email = email.trim();
    }

    if (contact.trim()) {
      const sanitizedContact = sanitizePhone(contact);
      if (sanitizedContact) {
        brokerData.contact = parseInt(sanitizedContact);
      }
    }

    const result = await createBroker(supabase, brokerData);
    
    if (result.success) {
      setShowSaveButton(false);
      // Refresh search to include the new broker
      searchFunction(value);
    } else {
      console.error('Failed to save broker:', result.error);
      // Could show a toast notification here
    }
    
    setSavingBroker(false);
  };

  const validateEditForm = (field: string) => {
    const errors = { name: '', email: '', contact: '' };
    
    if (field === 'name' || field === 'all') {
      if (!editForm.name.trim()) {
        errors.name = 'Broker name is required';
      }
    }
    
    if (field === 'email' || field === 'all') {
      if (!editForm.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    if (field === 'contact' || field === 'all') {
      if (editForm.contact.trim()) {
        const sanitized = sanitizePhone(editForm.contact);
        if (!sanitized || sanitized.length !== 10) {
          errors.contact = 'Contact must be a valid 10-digit phone number';
        }
      }
    }
    
    setEditFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleEditBroker = (broker: Broker) => {
    setEditingBroker(broker.id);
    setEditForm({
      name: broker.name,
      email: broker.email || '',
      contact: broker.contact ? broker.contact.toString() : ''
    });
    setEditFormErrors({ name: '', email: '', contact: '' });
  };

  const handleCancelEdit = () => {
    setEditingBroker(null);
    setEditForm({ name: '', email: '', contact: '' });
    setEditFormErrors({ name: '', email: '', contact: '' });
  };

  const handleEditFormChange = (field: 'name' | 'email' | 'contact', value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Validate the specific field after a short delay
    setTimeout(() => {
      const errors = { name: '', email: '', contact: '' };
      
      if (field === 'name' && !value.trim()) {
        errors.name = 'Broker name is required';
      }
      
      if (field === 'email') {
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Invalid email format';
        }
      }
      
      if (field === 'contact' && value.trim()) {
        const sanitized = sanitizePhone(value);
        if (!sanitized || sanitized.length !== 10) {
          errors.contact = 'Contact must be a valid 10-digit phone number';
        }
      }
      
      setEditFormErrors(prev => ({ ...prev, [field]: errors[field] }));
    }, 300);
  };

  const handleUpdateBroker = async (brokerId: string) => {
    // Validate all fields before saving
    const isValid = validateEditForm('all');
    if (!isValid) {
      return; // Don't save if validation fails
    }

    setUpdatingBroker(true);

    const brokerData: { name?: string; email?: string; contact?: number } = {
      name: editForm.name.trim()
    };

    if (editForm.email.trim()) {
      brokerData.email = editForm.email.trim();
    }

    if (editForm.contact.trim()) {
      const sanitizedContact = sanitizePhone(editForm.contact);
      if (sanitizedContact && sanitizedContact.length === 10) {
        brokerData.contact = parseInt(sanitizedContact);
      } else {
        // This shouldn't happen due to validation, but just in case
        setEditFormErrors(prev => ({ ...prev, contact: 'Invalid phone number format' }));
        setUpdatingBroker(false);
        return;
      }
    } else {
      brokerData.contact = undefined; // Will be stored as null in DB
    }

    const result = await updateBroker(supabase, brokerId, brokerData);
    
    if (result.success) {
      setEditingBroker(null);
      setEditForm({ name: '', email: '', contact: '' });
      setEditFormErrors({ name: '', email: '', contact: '' });
      // Refresh search to show updated broker
      searchFunction(value);
      
      // If this broker was selected, update the form
      if (result.data && result.data.name === value) {
        onChange('brokerName', result.data.name);
        onChange('brokerEmail', result.data.email || '');
        onChange('brokerContact', result.data.contact ? result.data.contact.toString() : '');
      }
    } else {
      console.error('Failed to update broker:', result.error);
    }
    
    setUpdatingBroker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange('brokerName', newValue);
    if (newValue.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 && value.length >= 2) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="broker-autocomplete-container" style={{ position: 'relative' }}>
      <div className="broker-input-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={onBlur}
          className={error ? 'input-field-error' : className}
          placeholder={placeholder}
          autoComplete="off"
        />
        
        {showSaveButton && value.trim() && (
          <button
            type="button"
            onClick={handleSaveBroker}
            disabled={savingBroker}
            className="btn-secondary"
            style={{ 
              padding: '8px 12px', 
              fontSize: '14px',
              whiteSpace: 'nowrap',
              minWidth: 'auto'
            }}
            title="Save this broker for future use"
          >
            {savingBroker ? '...' : '+ Save'}
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="broker-suggestions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          {loading && (
            <div style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
              Searching...
            </div>
          )}
          
          {!loading && suggestions.length === 0 && (
            <div style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
              No brokers found
            </div>
          )}
          
          {!loading && suggestions.map((broker) => (
            <div key={broker.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              {editingBroker === broker.id ? (
                // Edit mode
                <div style={{ padding: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditFormChange('name', e.target.value)}
                      placeholder="Broker name"
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: editFormErrors.name ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginBottom: '2px'
                      }}
                    />
                    {editFormErrors.name && (
                      <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>
                        {editFormErrors.name}
                      </div>
                    )}
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      placeholder="Email *"
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: editFormErrors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '2px'
                      }}
                    />
                    {editFormErrors.email && (
                      <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>
                        {editFormErrors.email}
                      </div>
                    )}
                    <input
                      type="tel"
                      value={editForm.contact}
                      onChange={(e) => handleEditFormChange('contact', e.target.value)}
                      placeholder="Contact (10 digits)"
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: editFormErrors.contact ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '2px'
                      }}
                    />
                    {editFormErrors.contact && (
                      <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>
                        {editFormErrors.contact}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updatingBroker}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateBroker(broker.id)}
                      disabled={updatingBroker || !editForm.name.trim() || Object.values(editFormErrors).some(error => error !== '')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        cursor: (updatingBroker || !editForm.name.trim() || Object.values(editFormErrors).some(error => error !== '')) ? 'not-allowed' : 'pointer',
                        opacity: (updatingBroker || !editForm.name.trim() || Object.values(editFormErrors).some(error => error !== '')) ? 0.5 : 1
                      }}
                    >
                      {updatingBroker ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div
                    onClick={() => handleSelectBroker(broker)}
                    style={{ flex: 1 }}
                  >
                    <div style={{ fontWeight: '500', color: '#111827' }}>
                      {broker.name}
                    </div>
                    {(broker.email || broker.contact) && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {broker.email && <span>{broker.email}</span>}
                        {broker.email && broker.contact && <span> • </span>}
                        {broker.contact && <span>{formatPhoneForDisplay(broker.contact)}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditBroker(broker);
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      marginLeft: '8px'
                    }}
                    title="Edit broker information"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Format phone number for display
function formatPhoneForDisplay(phone: number): string {
  const phoneStr = phone.toString();
  if (phoneStr.length === 10) {
    return `(${phoneStr.slice(0, 3)}) ${phoneStr.slice(3, 6)}-${phoneStr.slice(6)}`;
  }
  return phoneStr;
}