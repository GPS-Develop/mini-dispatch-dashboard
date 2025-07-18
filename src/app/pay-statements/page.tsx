'use client';

import dynamic from 'next/dynamic';
import { SkeletonTable } from '../../components/Skeleton/Skeleton';

// Lazy load the PayStatementsPage component
const PayStatementsPage = dynamic(
  () => import("../../features/paystatements/PayStatementsPage"),
  {
    loading: () => <SkeletonTable />,
    ssr: false // This page has client-side state, disable SSR
  }
);
 
export default function Page() {
  return <PayStatementsPage />;
} 