"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/create');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center text-white animate-pulse">
            Redirecting to class setup...
        </div>
    );
}
