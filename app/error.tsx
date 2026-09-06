'use client';

import React from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E1] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="font-serif text-2xl mb-2">Something went wrong</h2>
      <p className="text-xs text-[#8A8A85] mb-6 font-mono max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 border border-[#A68E6A] text-[#E5E5E1] text-xs font-mono hover:bg-[#141414] transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
