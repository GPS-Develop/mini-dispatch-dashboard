"use client";
import { Load } from "../LoadContext";
import Button from "../../../components/Button/Button";

interface DeleteConfirmationModalProps {
  load: Load;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({ 
  load, 
  onConfirm, 
  onCancel, 
  isDeleting = false 
}: DeleteConfirmationModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="heading-lg text-danger">⚠️ Confirm Delete</h2>
        </div>
        <div className="modal-body">
          <p className="text-primary mb-4">
            Are you sure you want to delete <strong>Load #{load.reference_id}</strong>?
          </p>
          <p className="text-muted">
            This action cannot be undone. All associated pickups, deliveries, and documents will also be deleted.
          </p>
        </div>
        <div className="modal-footer">
          <div className="button-group-horizontal">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isDeleting}
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
              disabled={isDeleting}
              aria-label={`Confirm deletion of Load #${load.reference_id}`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Load'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}