"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Clock, AlertTriangle, UserX, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import type { VendorStatusData } from "@/app/api/vendor/status/route";

interface Props {
  children: React.ReactNode;
}

export default function VendorStatusGuard({ children }: Props) {
  const { user, token, hasHydrated, setAuth } = useAuthStore();
  const [status, setStatus] = useState<VendorStatusData["status"] | "loading">("loading");
  const [vendorName, setVendorName] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user || !token) { setStatus("loading"); return; }
    if (user.role === "admin") { setStatus("active"); return; }

    const currentUser = user;
    let cancelled = false;

    async function fetchStatus(bearerToken: string, isRetry = false): Promise<void> {
      try {
        const res = await authClient(bearerToken).get<ApiResponse<VendorStatusData>>("/api/vendor/status");
        if (cancelled) return;
        const data = res.data.data as VendorStatusData;
        setStatus(data.status);
        if (data.name) setVendorName(data.name);
      } catch {
        if (cancelled) return;
        if (isRetry) {
          window.location.href = "/login";
          return;
        }
        try {
          const refreshRes = await axios.post<ApiResponse<{ token: string }>>(
            "/api/auth/refresh",
            {},
            { withCredentials: true },
          );
          const newToken = refreshRes.data.data?.token;
          if (!newToken) throw new Error("missing token");
          setAuth(currentUser, newToken);
          await fetchStatus(newToken, true);
        } catch {
          if (!cancelled) window.location.href = "/login";
        }
      }
    }

    void fetchStatus(token);
    return () => { cancelled = true; };
  }, [hasHydrated, user, token, setAuth]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
              Application Pending Review
            </h2>
            {vendorName && (
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{vendorName}</p>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Your vendor application has been received and is currently under review by our team.
            You will receive an email once your account is approved and activated.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-2">
              What happens next?
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1.5 list-disc list-inside">
              <li>Admin reviews your application and business details</li>
              <li>You receive an approval email when activated</li>
              <li>You can then log in and start managing your store</li>
            </ul>
          </div>
          <p className="text-xs text-gray-400">
            Questions? Contact{" "}
            <a href="mailto:support@prakashsupermarket.co.uk" className="underline hover:text-gray-600">
              support@prakashsupermarket.co.uk
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (status === "suspended") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
              Account Suspended
            </h2>
            {vendorName && (
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{vendorName}</p>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Your vendor account has been suspended. Please contact our support team for more information
            and to resolve any outstanding issues.
          </p>
          <p className="text-xs text-gray-400">
            Contact{" "}
            <a href="mailto:support@prakashsupermarket.co.uk" className="underline hover:text-gray-600">
              support@prakashsupermarket.co.uk
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UserX className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
              No Vendor Profile Found
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Your account does not have an associated vendor profile. If you registered as a vendor,
            please contact support to have your account properly configured.
          </p>
          <p className="text-xs text-gray-400">
            Contact{" "}
            <a href="mailto:support@prakashsupermarket.co.uk" className="underline hover:text-gray-600">
              support@prakashsupermarket.co.uk
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
