"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIState {
  // Modal states
  modals: {
    [key: string]: boolean;
  };
  // Loading states for different operations
  loading: {
    [key: string]: boolean;
  };
  // Error messages for different components
  errors: {
    [key: string]: string;
  };
  // Selected items
  selected: {
    [key: string]: unknown;
  };
  // Form states
  forms: {
    [key: string]: unknown;
  };
}

interface UIContextType {
  state: UIState;
  // Modal management
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  isModalOpen: (modalId: string) => boolean;
  
  // Loading management
  setLoading: (operation: string, isLoading: boolean) => void;
  isLoading: (operation: string) => boolean;
  
  // Error management
  setError: (componentId: string, error: string) => void;
  clearError: (componentId: string) => void;
  getError: (componentId: string) => string;
  
  // Selection management
  setSelected: (itemType: string, item: unknown) => void;
  getSelected: (itemType: string) => unknown;
  clearSelected: (itemType: string) => void;
  
  // Form management
  setForm: (formId: string, formData: unknown) => void;
  updateForm: (formId: string, updates: Record<string, unknown>) => void;
  getForm: (formId: string) => unknown;
  clearForm: (formId: string) => void;
  
  // Utility
  resetUI: () => void;
}

const initialState: UIState = {
  modals: {},
  loading: {},
  errors: {},
  selected: {},
  forms: {}
};

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UIState>(initialState);

  const openModal = (modalId: string) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [modalId]: true }
    }));
  };

  const closeModal = (modalId: string) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [modalId]: false }
    }));
  };

  const closeAllModals = () => {
    setState(prev => ({
      ...prev,
      modals: {}
    }));
  };

  const isModalOpen = (modalId: string): boolean => {
    return state.modals[modalId] || false;
  };

  const setLoading = (operation: string, isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [operation]: isLoading }
    }));
  };

  const isLoading = (operation: string): boolean => {
    return state.loading[operation] || false;
  };

  const setError = (componentId: string, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [componentId]: error }
    }));
  };

  const clearError = (componentId: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [componentId]: '' }
    }));
  };

  const getError = (componentId: string): string => {
    return state.errors[componentId] || '';
  };

  const setSelected = (itemType: string, item: unknown) => {
    setState(prev => ({
      ...prev,
      selected: { ...prev.selected, [itemType]: item }
    }));
  };

  const getSelected = (itemType: string): unknown => {
    return state.selected[itemType];
  };

  const clearSelected = (itemType: string) => {
    setState(prev => ({
      ...prev,
      selected: { ...prev.selected, [itemType]: null }
    }));
  };

  const setForm = (formId: string, formData: unknown) => {
    setState(prev => ({
      ...prev,
      forms: { ...prev.forms, [formId]: formData }
    }));
  };

  const updateForm = (formId: string, updates: Record<string, unknown>) => {
    setState(prev => ({
      ...prev,
      forms: { 
        ...prev.forms, 
        [formId]: { 
          ...(prev.forms[formId] as Record<string, unknown> || {}), 
          ...updates 
        } 
      }
    }));
  };

  const getForm = (formId: string): unknown => {
    return state.forms[formId];
  };

  const clearForm = (formId: string) => {
    setState(prev => ({
      ...prev,
      forms: { ...prev.forms, [formId]: null }
    }));
  };

  const resetUI = () => {
    setState(initialState);
  };

  const value: UIContextType = {
    state,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    setLoading,
    isLoading,
    setError,
    clearError,
    getError,
    setSelected,
    getSelected,
    clearSelected,
    setForm,
    updateForm,
    getForm,
    clearForm,
    resetUI
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}