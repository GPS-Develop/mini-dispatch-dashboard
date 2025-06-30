"use client";
import ViewPayStatementPage from '../../../features/paystatements/ViewPayStatementPage';

export default function PayStatementViewRoute({ params }: { params: { id: string } }) {
  return <ViewPayStatementPage payStatementId={params.id} />;
} 