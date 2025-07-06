"use client";
import React from 'react';
import Button from '../Button/Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  illustration?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
  };
  className?: string;
}

export default function EmptyState({
  illustration = '📋',
  title,
  description,
  primaryAction,
  secondaryAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`${styles.emptyState} ${className}`}>
      <div className={styles.illustration}>
        {illustration}
      </div>
      
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
      
      {(primaryAction || secondaryAction) && (
        <div className={styles.actions}>
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'primary'}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'secondary'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function EmptyDrivers({ onCreateDriver }: { onCreateDriver: () => void }) {
  return (
    <EmptyState
      illustration="🚛👥"
      title="Ready to add your first driver?"
      description="Add drivers to assign loads and track delivery progress. Each driver gets their own account to update load status and upload documents."
      primaryAction={{
        label: "➕ Create Driver Account",
        onClick: onCreateDriver
      }}
    />
  );
}

export function EmptyLoads({ onCreateLoad }: { onCreateLoad: () => void }) {
  return (
    <EmptyState
      illustration="📦🚚"
      title="No loads scheduled yet"
      description="Create your first load to start managing deliveries. You can assign drivers, set pickup/delivery locations, and track progress."
      primaryAction={{
        label: "➕ Create Load",
        onClick: onCreateLoad
      }}
    />
  );
}

export function EmptyActivity({ onViewLoads }: { onViewLoads?: () => void }) {
  return (
    <EmptyState
      illustration="📋✨"
      title="All caught up!"
      description="Driver activities like status updates and document uploads will appear here when drivers update their loads."
      secondaryAction={onViewLoads ? {
        label: "👀 View All Loads",
        onClick: onViewLoads
      } : undefined}
    />
  );
}

export function EmptyPayStatements({ onCreatePayStatement }: { onCreatePayStatement: () => void }) {
  return (
    <EmptyState
      illustration="💰📊"
      title="No pay statements yet"
      description="Create pay statements to track driver compensation, deductions, and payment history for accurate financial records."
      primaryAction={{
        label: "➕ Create Pay Statement",
        onClick: onCreatePayStatement
      }}
    />
  );
}

export function EmptySearch({ 
  searchTerm, 
  onClearSearch 
}: { 
  searchTerm: string; 
  onClearSearch: () => void;
}) {
  return (
    <EmptyState
      illustration="🔍❌"
      title={`No results for "${searchTerm}"`}
      description="Try adjusting your search terms or clearing filters to see more results."
      primaryAction={{
        label: "Clear Search",
        onClick: onClearSearch,
        variant: "secondary"
      }}
    />
  );
}