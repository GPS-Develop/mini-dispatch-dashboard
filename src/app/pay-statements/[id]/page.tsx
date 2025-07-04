"use client";
import { use } from 'react';
import ViewPayStatementPage from '../../../features/paystatements/ViewPayStatementPage';

export default function PayStatementViewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ViewPayStatementPage payStatementId={id} />;
} 