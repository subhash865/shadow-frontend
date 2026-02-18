"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Consolidated: This page now redirects to /admin/timetable
// The timetable editor functionality lives in a single location
export default function TimetableEditorRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/timetable');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center text-white animate-pulse">
            Redirecting to Timetable Editor...
        </div>
    );
}