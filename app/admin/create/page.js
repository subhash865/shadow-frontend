"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Consolidated: This page now redirects to /admin/subjects (Subjects Manager)
export default function SubjectsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/subjects');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center text-white animate-pulse">
            Redirecting to Subjects Manager...
        </div>
    );
}