"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-xl font-bold text-red-400">Something went wrong!</h2>
        <p className="mb-4 text-sm text-slate-400">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

