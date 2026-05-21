"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import { toast } from "sonner";
import type { LegalPage } from "@/types";
import { LegalPageEditor } from "@/components/admin/legal-pages/LegalPageEditor";

export default function EditLegalPagePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuthStore();
  const router = useRouter();

  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await authClient(token).get<{ success: boolean; data: LegalPage[] }>(
        "/api/admin/legal-pages"
      );
      if (data.success) {
        const found = data.data.find((p) => p.slug === slug);
        if (found) {
          setPage(found);
        } else {
          toast.error("Legal page not found");
          router.push("/admin/legal-pages");
        }
      }
    } catch {
      toast.error("Failed to load legal page");
    } finally {
      setLoading(false);
    }
  }, [token, slug, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/admin/legal-pages"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Legal Pages
      </Link>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : page ? (
        <LegalPageEditor page={page} token={token!} onSaved={() => void load()} />
      ) : null}
    </div>
  );
}
