"use client";

import Image from "next/image";
import { Pencil, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";

const BADGE_COLORS: Record<string, string> = {
  NEW:       "bg-blue-100 text-blue-700",
  HOT:       "bg-red-100 text-red-700",
  LIMITED:   "bg-orange-100 text-orange-700",
  ORGANIC:   "bg-green-100 text-green-700",
  EXCLUSIVE: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  /** Show Vendor column — admin only */
  showVendorColumn?: boolean;
  /** Show Status column + approval actions — admin only */
  showStatusColumn?: boolean;
  onApprove?: (id: string, status: "approved" | "rejected") => void;
  approving?: string | null;
  /** CSS maxHeight for the outer card; omit for auto height */
  maxHeight?: string;
  /** "vendor" tints the edit button green instead of blue */
  variant?: "admin" | "vendor";
}

export function ProductsTable({
  products,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onEdit,
  onDelete,
  showVendorColumn = false,
  showStatusColumn = false,
  onApprove,
  approving = null,
  maxHeight,
  variant = "admin",
}: ProductsTableProps) {
  const colCount = 6 + (showVendorColumn ? 1 : 0) + (showStatusColumn ? 1 : 0);

  const editBtnCls =
    variant === "vendor"
      ? "hover:text-[#1a7a4a] hover:bg-green-50 dark:hover:bg-green-950/30"
      : "hover:text-[#0F4C75] hover:bg-blue-50 dark:hover:bg-blue-950/30";

  const headers: string[] = ["Product"];
  if (showVendorColumn) headers.push("Vendor");
  headers.push("Category", "Price", "Badge", "Stock");
  if (showStatusColumn) headers.push("Status");
  headers.push("Actions");

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={colCount} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p._id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                  data-testid="product-row"
                >
                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Image
                          src={p.images[0] ?? "/images/placeholder-product.webp"}
                          alt={p.name}
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{p.brand}</p>
                      </div>
                    </div>
                  </td>

                  {/* Vendor (admin only) */}
                  {showVendorColumn && (
                    <td className="px-4 py-3">
                      {p.vendorName ? (
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                          {p.vendorName}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">Platform</span>
                      )}
                    </td>
                  )}

                  {/* Category */}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.category}</td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      ₹{p.price.toFixed(0)}
                    </span>
                    {p.originalPrice && (
                      <span className="ml-1 text-xs text-gray-400 line-through">
                        ₹{p.originalPrice.toFixed(0)}
                      </span>
                    )}
                  </td>

                  {/* Badge */}
                  <td className="px-4 py-3">
                    {p.badge ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_COLORS[p.badge] ?? ""}`}>
                        {p.badge}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}
                    >
                      {p.inStock ? "In Stock" : "Out"}
                    </span>
                  </td>

                  {/* Status (admin only) */}
                  {showStatusColumn && (
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          STATUS_COLORS[p.status ?? "approved"] ?? ""
                        }`}
                      >
                        {p.status ?? "approved"}
                      </span>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {onApprove && (p.status === "pending" || p.status === "rejected") && (
                        <button
                          onClick={() => onApprove(p._id, "approved")}
                          disabled={approving === p._id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors disabled:opacity-50"
                          title="Approve"
                          data-testid={`approve-product-${p._id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {onApprove && (p.status === "pending" || p.status === "approved") && (
                        <button
                          onClick={() => onApprove(p._id, "rejected")}
                          disabled={approving === p._id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                          title="Reject"
                          data-testid={`reject-product-${p._id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(p)}
                        className={`p-1.5 rounded-lg text-gray-400 transition-colors ${editBtnCls}`}
                        data-testid={`edit-product-${p._id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        data-testid={`delete-product-${p._id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm shrink-0">
          <span className="text-gray-500" data-testid="pagination-info">
            Page {page} of {totalPages} · {total} products
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              data-testid="prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              data-testid="next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
