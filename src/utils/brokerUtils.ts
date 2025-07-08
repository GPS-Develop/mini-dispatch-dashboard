import { SupabaseClient } from '@supabase/supabase-js';
import { Broker } from '../types';

// Search brokers by name
export const searchBrokers = async (
  supabase: SupabaseClient,
  searchTerm: string
): Promise<{ success: boolean; data?: Broker[]; error?: string }> => {
  try {
    if (!searchTerm.trim()) {
      return { success: true, data: [] };
    }

    const { data: brokers, error } = await supabase
      .from('brokers')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(10);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: brokers || [] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to search brokers' 
    };
  }
};

// Get all brokers
export const getAllBrokers = async (
  supabase: SupabaseClient
): Promise<{ success: boolean; data?: Broker[]; error?: string }> => {
  try {
    const { data: brokers, error } = await supabase
      .from('brokers')
      .select('*')
      .order('name');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: brokers || [] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch brokers' 
    };
  }
};

// Create a new broker
export const createBroker = async (
  supabase: SupabaseClient,
  brokerData: { name: string; email?: string; contact?: number }
): Promise<{ success: boolean; data?: Broker; error?: string }> => {
  try {
    // Check if broker with this name already exists
    const { data: existingBrokers, error: checkError } = await supabase
      .from('brokers')
      .select('id')
      .eq('name', brokerData.name);

    if (checkError) {
      console.warn('Error checking for existing broker:', checkError);
      // Continue with creation attempt even if check fails
    }

    if (existingBrokers && existingBrokers.length > 0) {
      return { success: false, error: 'A broker with this name already exists' };
    }

    const { data: broker, error } = await supabase
      .from('brokers')
      .insert([brokerData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: broker };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create broker' 
    };
  }
};

// Update an existing broker
export const updateBroker = async (
  supabase: SupabaseClient,
  brokerId: string,
  brokerData: { name?: string; email?: string; contact?: number }
): Promise<{ success: boolean; data?: Broker; error?: string }> => {
  try {
    const { data: broker, error } = await supabase
      .from('brokers')
      .update(brokerData)
      .eq('id', brokerId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: broker };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update broker' 
    };
  }
};

// Get broker by exact name
export const getBrokerByName = async (
  supabase: SupabaseClient,
  name: string
): Promise<{ success: boolean; data?: Broker; error?: string }> => {
  try {
    const { data: broker, error } = await supabase
      .from('brokers')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { success: true, data: undefined };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: broker };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch broker' 
    };
  }
};