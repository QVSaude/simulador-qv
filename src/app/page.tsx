'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the login page, which is the main entry point for brokers.
    router.replace('/login');
  }, [router]);

  // Render nothing or a loading state while redirecting
  return null; 
}
