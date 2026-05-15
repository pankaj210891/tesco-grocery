import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RoleGuard from "@/components/layout/RoleGuard";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </RoleGuard>
  );
}
