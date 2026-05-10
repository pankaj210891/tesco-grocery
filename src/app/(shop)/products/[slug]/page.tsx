import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, Truck } from "lucide-react";
import { slugify, formatPrice } from "@/lib/utils/format";
import { getProductBySlug, getAllProductSlugs } from "@/services/product.service";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ImageGallery from "@/components/product/ImageGallery";
import RatingStars from "@/components/product/RatingStars";
import ProductAddToCart from "@/components/product/ProductAddToCart";
import RelatedProducts from "@/components/product/RelatedProducts";
import Badge from "@/components/ui/Badge";
import ProductTabs from "@/components/product/ProductTabs";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product Not Found" };

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100
        )
      : null;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: product.category, href: `/categories/${slugify(product.category)}` },
    { label: product.name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      <Breadcrumb items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
        <div>
          <ImageGallery images={product.images} alt={product.name} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#00539F] uppercase tracking-wider">
              {product.category}
            </span>
            {discount && <Badge variant="sale" label={`${discount}% off`} />}
            {!product.inStock && <Badge variant="outOfStock" />}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 leading-tight">
            {product.name}
          </h1>

          <p className="text-sm text-gray-500 -mt-2">
            by <span className="font-semibold text-gray-700 dark:text-gray-300">{product.brand}</span>
          </p>

          <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="md" />

          <hr className="border-gray-100 dark:border-gray-800" />

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-gray-900 dark:text-gray-100">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {discount && (
                <span className="text-sm font-bold text-[#EE1C2E]">
                  Save {discount}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{product.unit}</p>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              {product.inStock ? "In stock — ready to dispatch" : "Currently out of stock"}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Truck className="h-4 w-4 text-[#00539F] shrink-0" />
              Free delivery on orders over £40
            </li>
          </ul>

          <ProductAddToCart product={product} />
        </div>
      </div>

      {/* ── Tabs: Product Details + Reviews ─────────────────────────────── */}
      <div className="mt-12">
        <ProductTabs product={product} />
      </div>

      <RelatedProducts currentProduct={product} />
    </div>
  );
}
