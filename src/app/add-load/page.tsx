'use client';

import dynamic from 'next/dynamic';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';

// Lazy load the AddLoadPage component
const AddLoadPage = dynamic(
  () => import('../../features/loads/AddLoadPage'),
  {
    loading: () => <SkeletonTable />,
    ssr: false
  }
);

export default AddLoadPage; 