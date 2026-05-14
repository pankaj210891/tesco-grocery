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
        <div key={product._id} className="flex-shrink-0 snap-start w-[calc(100vw-4rem)] sm:w-[calc(50vw-2.5rem)] lg:w-[calc(25vw-1.25rem)] xl:w-[270px]">
          <ProductCard product={product} />
        </div>
      ))}
    </SectionCarousel>
  );
}
