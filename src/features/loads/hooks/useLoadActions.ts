"use client";
import { useState, useCallback } from 'react';
import { useLoads, Load } from '../LoadContext';
import { createClient } from '../../../utils/supabase/client';
import { sanitizePhone } from '../../../utils/validation';
import { LumperServiceForm, LumperService } from '../../../types';
import { LoadEditForm } from '../components/LoadEditForm';
import { convertFrontendLoadToDatabase } from '../../../utils/typeConversions';

export function useLoadActions() {
  const { updateLoad, deleteLoad } = useLoads();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleStatusUpdate = useCallback(async (load: Load, status: "Scheduled" | "In-Transit" | "Delivered") => {
    setError("");
    try {
      await updateLoad(load.id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update load status');
      throw err;
    }
  }, [updateLoad]);

  const handleLoadDelete = useCallback(async (loadId: string) => {
    setError("");
    try {
      await deleteLoad(loadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete load');
      throw err;
    }
  }, [deleteLoad]);

  const handleLoadEdit = useCallback(async (
    selected: Load,
    editForm: LoadEditForm,
    lumperForm: LumperServiceForm,
    lumperMap: Record<string, LumperService>,
    fetchAllPickupsDeliveries: () => Promise<void>
  ) => {
    setIsSubmitting(true);
    setError("");
    
    // Validate broker contact before submission
    const brokerContactStr = typeof editForm.broker_contact === 'number' ? 
      editForm.broker_contact.toString() : 
      editForm.broker_contact || '';
    const sanitizedBrokerContact = sanitizePhone(brokerContactStr);
    if (!sanitizedBrokerContact || sanitizedBrokerContact.length < 10) {
      setError("Broker contact must be a valid phone number");
      setIsSubmitting(false);
      throw new Error("Invalid broker contact");
    }
    
    try {
      // Update main load
      const convertedRate = editForm.rate || 0;
      
      const frontendData = {
        driver_id: editForm.driver_id,
        rate: convertedRate,
        notes: editForm.notes,
        broker_name: editForm.broker_name,
        broker_contact: parseInt(sanitizedBrokerContact) || 0,
        broker_email: editForm.broker_email,
        load_type: editForm.load_type,
        temperature: editForm.temperature == null ? null : editForm.temperature,
      };
      
      // Convert to database format before sending
      const updatedData = convertFrontendLoadToDatabase(frontendData);
      await updateLoad(selected.id, updatedData);
        
      // Update pickups
      for (const p of editForm.pickups) {
        const { error: pickupError } = await supabase.from("pickups").update({
          name: p.name,
          address: p.address,
          city: p.city,
          state: p.state,
          postal_code: p.postal_code,
          datetime: p.datetime,
        }).eq("id", p.id);
        
        if (pickupError) {
          throw new Error(`Failed to update pickup: ${pickupError.message}`);
        }
      }
        
      // Update deliveries
      for (const d of editForm.deliveries) {
        const { error: deliveryError } = await supabase.from("deliveries").update({
          name: d.name,
          address: d.address,
          city: d.city,
          state: d.state,
          postal_code: d.postal_code,
          datetime: d.datetime,
        }).eq("id", d.id);
        
        if (deliveryError) {
          throw new Error(`Failed to update delivery: ${deliveryError.message}`);
        }
      }
        
      // Handle lumper service
      const existingLumperService = lumperMap[selected.id];
      
      // Prepare lumper service data
      const lumperData = {
        load_id: selected.id,
        no_lumper: lumperForm.no_lumper,
        paid_by_broker: lumperForm.paid_by_broker,
        paid_by_company: lumperForm.paid_by_company,
        paid_by_driver: lumperForm.paid_by_driver,
        broker_amount: lumperForm.broker_amount ? parseFloat(lumperForm.broker_amount) : null,
        company_amount: lumperForm.company_amount ? parseFloat(lumperForm.company_amount) : null,
        driver_amount: lumperForm.driver_amount ? parseFloat(lumperForm.driver_amount) : null,
        driver_payment_reason: lumperForm.driver_payment_reason || null
      };
      
      if (existingLumperService) {
        // Update existing lumper service
        const { error: lumperError } = await supabase
          .from('lumper_services')
          .update(lumperData)
          .eq('id', existingLumperService.id);
          
        if (lumperError) {
          throw new Error(`Failed to update lumper service: ${lumperError.message}`);
        }
      } else {
        // Create new lumper service
        const { error: lumperError } = await supabase
          .from('lumper_services')
          .insert([lumperData]);
          
        if (lumperError) {
          throw new Error(`Failed to create lumper service: ${lumperError.message}`);
        }
      }
      
      // Refresh pickup/delivery/lumper data
      await fetchAllPickupsDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update load');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [updateLoad, supabase]);

  return {
    error,
    isSubmitting,
    setError,
    handleStatusUpdate,
    handleLoadDelete,
    handleLoadEdit
  };
}