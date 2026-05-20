import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, Truck, ShieldCheck, RefreshCw, Tag } from "lucide-react";
import { slugify } from "@/lib/utils/format";
import { getProductBySlug, getAllProductSlugs } from "@/services/product.service";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ImageGallery from "@/components/product/ImageGallery";
import RatingStars from "@/components/product/RatingStars";
import ProductVariantSection from "@/components/product/ProductVariantSection";
import RelatedProducts from "@/components/product/RelatedProducts";
import Badge from "@/components/ui/Badge";
import ProductTabs from "@/components/product/ProductTabs";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product  = await getProductBySlug(slug);

  if (!product) return { title: "Product Not Found" };

  return {
    title:       product.name,
    description: product.description,
    openGraph: {
      title:       product.name,
      description: product.description,
      images:      product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product  = await getProductBySlug(slug);

  if (!product) notFound();

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const breadcrumbs = [
    { label: "Home",     href: "/" },
    { label: "Products", href: "/products" },
    { label: product.category, href: `/products?category=${slugify(product.category)}` },
    { label: product.name },
  ];

  const infoChips = [
    {
      Icon:  product.inStock ? CheckCircle : ShieldCheck,
      color: product.inStock ? "text-green-600 dark:text-green-400" : "text-gray-400",
      bg:    product.inStock ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30" : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700",
      label: "Availability",
      text:  product.inStock ? "In stock" : "Out of stock",
    },
    {
      Icon:  Truck,
      color: "text-[#FCA311]",
      bg:    "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30",
      label: "Delivery",
      text:  "Free over ₹500",
    },
    {
      Icon:  RefreshCw,
      color: "text-blue-500",
      bg:    "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30",
      label: "Returns",
      text:  "30-day easy returns",
    },
    {
      Icon:  Tag,
      color: "text-purple-500",
      bg:    "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30",
      label: "Category",
      text:  product.category,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      <Breadcrumb items={breadcrumbs} className="mb-6" />

      {/* ── Two-column product section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12 items-start">

        {/* Left: Gallery — sticky on desktop */}
        <div className="lg:sticky lg:top-20">
          <ImageGallery images={product.images} alt={product.name} />
        </div>

        {/* Right: Product Info */}
        <div className="flex flex-col gap-5">

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-[#FCA311] uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/30 px-2.5 py-1 rounded-full">
              {product.category}
            </span>
            {discount && <Badge variant="sale" label={`-${discount}%`} />}
            {!product.inStock && <Badge variant="outOfStock" />}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 leading-tight">
            {product.name}
          </h1>

          {/* Brand + Rating */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              by <span className="font-semibold text-gray-700 dark:text-gray-300">{product.brand}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="md" />
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Attribute cards */}
          <div className="grid grid-cols-2 gap-2">
            {infoChips.map(({ Icon, color, bg, label, text }) => (
              <div key={label} className={`flex items-start gap-3 px-3 py-3 rounded-xl border ${bg}`}>
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Variant selector + price + add to cart (client component — manages selection state) */}
          <ProductVariantSection product={product} />
        </div>
      </div>

      {/* ── Tabs: Details + Reviews ── */}
      <div className="mt-14">
        <ProductTabs product={product} />
      </div>

      <RelatedProducts currentProduct={product} />
    </div>
  );
}
