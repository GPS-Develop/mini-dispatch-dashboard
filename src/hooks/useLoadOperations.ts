import { useCallback } from 'react';
import { createClient } from '../utils/supabase/client';
import { useAppData } from './useAppData';
import { Load } from '../features/loads/LoadContext';
import { Pickup, Delivery } from '../types';

/**
 * Hook for common load operations with integrated state management
 * Reduces code duplication across components that work with loads
 */
export function useLoadOperations() {
  const { loads, ui } = useAppData();
  const supabase = createClient();

  // Fetch pickups and deliveries for loads
  const fetchPickupsDeliveries = useCallback(async (loadIds: string[]) => {
    if (loadIds.length === 0) return { pickups: {}, deliveries: {} };
    
    try {
      ui.setLoading('pickupsDeliveries', true);
      
      const { data: pickups, error: pickupsError } = await supabase
        .from("pickups")
        .select("*")
        .in("load_id", loadIds);
        
      const { data: deliveries, error: deliveriesError } = await supabase
        .from("deliveries")
        .select("*")
        .in("load_id", loadIds);
      
      if (pickupsError || deliveriesError) {
        throw new Error(pickupsError?.message || deliveriesError?.message || 'Failed to fetch pickup/delivery data');
      }
      
      const pickupsByLoad: Record<string, Pickup[]> = {};
      const deliveriesByLoad: Record<string, Delivery[]> = {};
      
      pickups?.forEach(p => {
        if (!pickupsByLoad[p.load_id]) pickupsByLoad[p.load_id] = [];
        pickupsByLoad[p.load_id].push(p);
      });
      
      deliveries?.forEach(d => {
        if (!deliveriesByLoad[d.load_id]) deliveriesByLoad[d.load_id] = [];
        deliveriesByLoad[d.load_id].push(d);
      });
      
      return { pickups: pickupsByLoad, deliveries: deliveriesByLoad };
    } catch (error) {
      ui.setError('pickupsDeliveries', error instanceof Error ? error.message : 'Failed to fetch data');
      return { pickups: {}, deliveries: {} };
    } finally {
      ui.setLoading('pickupsDeliveries', false);
    }
  }, [supabase, ui]);

  // Update load status
  const updateLoadStatus = useCallback(async (load: Load, status: "Scheduled" | "In-Transit" | "Delivered") => {
    try {
      ui.setLoading(`updateStatus-${load.id}`, true);
      ui.clearError('loadOperations');
      
      await loads.updateLoad(load.id, { status });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update load status';
      ui.setError('loadOperations', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      ui.setLoading(`updateStatus-${load.id}`, false);
    }
  }, [loads, ui]);

  // Delete load with confirmation
  const deleteLoadWithConfirmation = useCallback(async (load: Load) => {
    try {
      ui.setLoading(`delete-${load.id}`, true);
      ui.clearError('loadOperations');
      
      await loads.deleteLoad(load.id);
      
      // Clear any selected state for this load
      ui.clearSelected('load');
      ui.closeModal(`delete-${load.id}`);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete load';
      ui.setError('loadOperations', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      ui.setLoading(`delete-${load.id}`, false);
    }
  }, [loads, ui]);

  // Load management state helpers
  const loadHelpers = {
    selectLoad: (load: Load) => ui.setSelected('load', load),
    getSelectedLoad: () => ui.getSelected('load') as Load | null,
    clearSelectedLoad: () => ui.clearSelected('load'),
    
    openEditMode: (load: Load) => {
      ui.setSelected('load', load);
      ui.openModal('editLoad');
    },
    closeEditMode: () => {
      ui.closeModal('editLoad');
      ui.clearForm('editLoad');
    },
    
    openDeleteConfirmation: (load: Load) => {
      ui.setSelected('loadToDelete', load);
      ui.openModal(`delete-${load.id}`);
    },
    closeDeleteConfirmation: (load: Load) => {
      ui.closeModal(`delete-${load.id}`);
      ui.clearSelected('loadToDelete');
    },
    
    isLoadSelected: (loadId: string) => {
      const selected = ui.getSelected('load') as Load | null;
      return selected?.id === loadId;
    },
    
    isLoadBeingDeleted: (loadId: string) => ui.isLoading(`delete-${loadId}`),
    isLoadStatusUpdating: (loadId: string) => ui.isLoading(`updateStatus-${loadId}`),
  };

  return {
    // Operations
    fetchPickupsDeliveries,
    updateLoadStatus,
    deleteLoadWithConfirmation,
    
    // State helpers
    ...loadHelpers,
    
    // Loading states
    isLoadingPickupsDeliveries: ui.isLoading('pickupsDeliveries'),
    
    // Error states
    operationError: ui.getError('loadOperations'),
    pickupDeliveryError: ui.getError('pickupsDeliveries'),
    clearOperationError: () => ui.clearError('loadOperations'),
  };
}