'use client';

import dynamic from 'next/dynamic';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';

// Lazy load the LoadsPage component
const LoadsPage = dynamic(
  () => import('../../features/loads/LoadsPage'),
  {
    loading: () => <SkeletonTable />,
    ssr: false
  }
);

export default LoadsPage; 