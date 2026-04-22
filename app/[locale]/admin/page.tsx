// app/[locale]/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/session');
        
        // ✅ Check content-type
        const contentType = res.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          console.error('Session API returned non-JSON');
          router.push('/en/login');
          return;
        }
        
        const data = await res.json();
        
        if (!data?.user || data.user.role !== 'ADMIN') {
          router.push('/en/login');
          return;
        }
      } catch (error) {
        console.error('Session check failed:', error);
        router.push('/en/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}