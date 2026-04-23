import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-bold tracking-tight text-text-primary">
          Omni<span className="text-accent-iris">Commerce</span>
        </Link>
      </div>
      <div className="w-full max-w-md px-6">{children}</div>
    </div>
  );
}
