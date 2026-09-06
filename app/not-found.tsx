import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E1] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="font-serif text-3xl mb-2">Page Not Found</h2>
      <p className="text-sm text-[#8A8A85] mb-6 font-mono">The requested reflection or page does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 border border-[#A68E6A] text-[#E5E5E1] text-xs font-mono hover:bg-[#141414] transition-colors"
      >
        Return to ReflectIQ
      </Link>
    </div>
  );
}
