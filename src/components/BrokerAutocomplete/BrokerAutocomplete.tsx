'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Broker } from '../../types';
import { searchBrokers, createBroker } from '../../utils/brokerUtils';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
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
    }, 300),
    [supabase]
  );

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

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
      debouncedSearch(value);
    } else {
      console.error('Failed to save broker:', result.error);
      // Could show a toast notification here
    }
    
    setSavingBroker(false);
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
            <div
              key={broker.id}
              onClick={() => handleSelectBroker(broker)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
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
          ))}
        </div>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Format phone number for display
function formatPhoneForDisplay(phone: number): string {
  const phoneStr = phone.toString();
  if (phoneStr.length === 10) {
    return `(${phoneStr.slice(0, 3)}) ${phoneStr.slice(3, 6)}-${phoneStr.slice(6)}`;
  }
  return phoneStr;
}