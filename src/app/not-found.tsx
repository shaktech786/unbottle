import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-7xl font-bold text-amber-500/30">404</p>
      <h1 className="text-2xl font-semibold text-neutral-50">Page not found</h1>
      <p className="max-w-sm text-neutral-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="mt-4">
        <Button variant="secondary">Back to Home</Button>
      </Link>
    </div>
  );
}
