"use client";
import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

export default function Skeleton({ 
  variant = 'text', 
  width = '100%', 
  height, 
  className = '',
  animate = true 
}: SkeletonProps) {
  const baseClass = styles.skeleton;
  const variantClass = styles[`skeleton-${variant}`];
  const animateClass = animate ? styles['skeleton-animate'] : '';
  
  const style: React.CSSProperties = {
    width,
    height: height || (variant === 'text' ? '1em' : variant === 'circular' ? width : '1rem'),
  };

  return (
    <div 
      className={`${baseClass} ${variantClass} ${animateClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Prebuilt skeleton components for common use cases
export function SkeletonText({ lines = 1, ...props }: { lines?: number } & Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={styles['skeleton-text-container']}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index} 
          variant="text" 
          width={index === lines - 1 ? '80%' : '100%'}
          {...props} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ 
  hasAvatar = false, 
  lines = 3 
}: { 
  hasAvatar?: boolean; 
  lines?: number; 
}) {
  return (
    <div className={styles['skeleton-card']}>
      <div className={styles['skeleton-card-header']}>
        {hasAvatar && <Skeleton variant="circular" width={40} height={40} />}
        <div className={styles['skeleton-card-content']}>
          <Skeleton variant="text" width="60%" height="1.2rem" />
          <Skeleton variant="text" width="40%" height="1rem" />
        </div>
      </div>
      <div className={styles['skeleton-card-body']}>
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number; 
  columns?: number; 
}) {
  const tableStyle = {
    '--columns': columns
  } as React.CSSProperties;

  return (
    <div className={styles['skeleton-table']} style={tableStyle}>
      {/* Table Header */}
      <div className={styles['skeleton-table-header']}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`header-${colIndex}`} variant="text" height="1.2rem" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className={styles['skeleton-table-row']}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`row-${rowIndex}-col-${colIndex}`} variant="text" height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
}