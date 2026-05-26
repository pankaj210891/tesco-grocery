import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RoleGuard from "@/components/layout/RoleGuard";
import SkipToMain from "@/components/layout/SkipToMain";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard>
      <SkipToMain />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
      </div>
    </RoleGuard>
  );
}
