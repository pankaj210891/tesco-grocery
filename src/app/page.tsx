import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/home/HeroBanner";
import PromoStrip from "@/components/home/PromoStrip";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import HomepageSections from "@/components/home/HomepageSections";
import { siteConfig } from "@/config/site";
import { getAllCategories } from "@/services/category.service";
import { getProducts } from "@/services/product.service";

export const metadata: Metadata = {
  title: `${siteConfig.name} — Fresh Food & Groceries Online`,
  description: siteConfig.description,
};

export default async function HomePage() {
  const [categories, { products: featuredProducts }] = await Promise.all([
    getAllCategories(),
    getProducts({ sortBy: "rating", limit: 8 }),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <HeroBanner />
        <PromoStrip />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          <CategoryGrid categories={categories} />
          <FeaturedProducts products={featuredProducts} />
          <HomepageSections />
        </div>
      </main>

      <Footer />
    </div>
  );
}
