'use client';

import dynamic from 'next/dynamic';
import { SkeletonTable } from '../../../components/Skeleton/Skeleton';

// Lazy load the CreatePayStatementPage component
const CreatePayStatementPage = dynamic(
  () => import("../../../features/paystatements/CreatePayStatementPage"),
  {
    loading: () => <SkeletonTable />,
    ssr: false
  }
);
 
export default function Page() {
  return <CreatePayStatementPage />;
} 