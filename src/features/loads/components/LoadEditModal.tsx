"use client";
import { LumperServiceForm, InputChangeEvent, SelectChangeEvent, TextareaChangeEvent, FormSubmitEvent } from '../../../types';
import { Load } from '../LoadContext';
import { Driver } from '../../drivers/DriverContext';
import { LoadEditForm, type LoadEditForm as LoadEditFormType } from './LoadEditForm';
import ModalErrorBoundary from '../../../components/ErrorBoundary/ModalErrorBoundary';
import FormErrorBoundary from '../../../components/ErrorBoundary/FormErrorBoundary';

interface LoadEditModalProps {
  load: Load;
  editForm: LoadEditFormType;
  lumperForm: LumperServiceForm;
  drivers: Driver[];
  isSubmitting: boolean;
  onFormChange: (e: InputChangeEvent | SelectChangeEvent | TextareaChangeEvent) => void;
  onPickupChange: (idx: number, e: InputChangeEvent | SelectChangeEvent) => void;
  onDeliveryChange: (idx: number, e: InputChangeEvent | SelectChangeEvent) => void;
  onLumperCheckboxChange: (field: keyof Pick<LumperServiceForm, 'no_lumper' | 'paid_by_broker' | 'paid_by_company' | 'paid_by_driver'>) => void;
  onLumperInputChange: (field: keyof LumperServiceForm, value: string) => void;
  onSubmit: (e: FormSubmitEvent) => Promise<void>;
  onCancel: () => void;
}


export function LoadEditModal({
  load,
  editForm,
  lumperForm,
  drivers,
  isSubmitting,
  onFormChange,
  onPickupChange,
  onDeliveryChange,
  onLumperCheckboxChange,
  onLumperInputChange,
  onSubmit,
  onCancel
}: LoadEditModalProps) {
  return (
    <ModalErrorBoundary onClose={onCancel}>
      <FormErrorBoundary>
        <LoadEditForm
          load={load}
          editForm={editForm}
          lumperForm={lumperForm}
          drivers={drivers}
          isSubmitting={isSubmitting}
          onFormChange={onFormChange}
          onPickupChange={onPickupChange}
          onDeliveryChange={onDeliveryChange}
          onLumperCheckboxChange={onLumperCheckboxChange}
          onLumperInputChange={onLumperInputChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </FormErrorBoundary>
    </ModalErrorBoundary>
  );
}