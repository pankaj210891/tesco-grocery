import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, Tag, Truck } from "lucide-react";
import { mockAllProducts } from "@/lib/data/mock-products";
import { slugify, formatPrice } from "@/lib/utils/format";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ImageGallery from "@/components/product/ImageGallery";
import RatingStars from "@/components/product/RatingStars";
import ProductAddToCart from "@/components/product/ProductAddToCart";
import RelatedProducts from "@/components/product/RelatedProducts";
import Badge from "@/components/ui/Badge";

type Props = {
  params: Promise<{ slug: string }>;
};

function getProduct(slug: string) {
  return mockAllProducts.find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

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
  return mockAllProducts.map((p) => ({ slug: p.slug }));
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100
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
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} className="mb-6" />

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
        {/* Left: image gallery */}
        <div>
          <ImageGallery images={product.images} alt={product.name} />
        </div>

        {/* Right: product info */}
        <div className="flex flex-col gap-5">
          {/* Category + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#00539F] uppercase tracking-wider">
              {product.category}
            </span>
            {discount && (
              <Badge variant="sale" label={`${discount}% off`} />
            )}
            {!product.inStock && <Badge variant="outOfStock" />}
          </div>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Brand */}
          <p className="text-sm text-gray-500 -mt-2">
            by <span className="font-semibold text-gray-700">{product.brand}</span>
          </p>

          {/* Rating */}
          <RatingStars
            rating={product.rating}
            reviewCount={product.reviewCount}
            size="md"
          />

          <hr className="border-gray-100" />

          {/* Price */}
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-gray-900">
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

          <hr className="border-gray-100" />

          {/* Description */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-gray-400" aria-hidden />
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Perks */}
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              {product.inStock ? "In stock — ready to dispatch" : "Currently out of stock"}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Truck className="h-4 w-4 text-[#00539F] shrink-0" />
              Free delivery on orders over £40
            </li>
          </ul>

          {/* Add to cart */}
          <ProductAddToCart product={product} />
        </div>
      </div>

      {/* Related products */}
      <RelatedProducts currentProduct={product} />
    </div>
  );
}
