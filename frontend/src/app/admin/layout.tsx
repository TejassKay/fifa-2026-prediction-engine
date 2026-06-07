import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Control Center
          </h1>
          <nav className="hidden md:flex gap-4">
            <Link href="/admin" className="text-sm text-neutral-400 hover:text-white transition-colors">Overview</Link>
            <Link href="/admin/results" className="text-sm text-neutral-400 hover:text-white transition-colors">Pending Fixtures</Link>
          </nav>
        </div>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300">
          Back to Public Site
        </Link>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
