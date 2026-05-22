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

// Featured products (rating-sorted) and categories can change; rebuild every 5 min.
export const revalidate = 300;

export const metadata: Metadata = {
  title:       `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default async function HomePage() {
  const [categories, { products: featuredProducts }] = await Promise.all([
    getAllCategories(),
    getProducts({ sortBy: "rating", limit: 8 }),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="flex-1">
        {/* Hero — full-width padded container */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-6">
            <HeroBanner />
          </div>
        </div>

        {/* Promo strip */}
        <PromoStrip />

        {/* ── Categories ── */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <CategoryGrid categories={categories} />
          </div>
        </div>

        {/* ── Featured Products + CMS sections ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
          <FeaturedProducts products={featuredProducts} />
          <HomepageSections />
        </div>
      </main>

      <Footer />
    </div>
  );
}
