import SectionCarousel from "@/components/ui/SectionCarousel";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types";

interface FeaturedProductsProps {
  products: Product[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <SectionCarousel
      title="Featured Products"
      description="Top picks handpicked for you"
      seeAllLabel="View all"
      seeAllHref="/products?sortBy=rating"
      titleId="featured-heading"
    >
      {products.map((product) => (
        <div key={product._id} className="flex-shrink-0 w-44 sm:w-52">
          <ProductCard product={product} />
        </div>
      ))}
    </SectionCarousel>
  );
}
