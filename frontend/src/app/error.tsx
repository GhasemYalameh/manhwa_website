"use client";

export default function GlobalError({ error }: { error: Error }) {
  return (
    <main className="p-6 text-sm text-text-primary">
      <p className="mb-2 font-bold">خطا:</p>
      <pre dir="ltr" className="whitespace-pre-wrap break-all text-xs">
        {error.message}
      </pre>
    </main>
  );
}
