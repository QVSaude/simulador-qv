'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  useEffect(() => {
    redirect('/dashboard/proposals');
  }, []);

  return null;
}
