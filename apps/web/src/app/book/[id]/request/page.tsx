"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VehicleRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/book/request?ids=${id}`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
    </div>
  );
}
