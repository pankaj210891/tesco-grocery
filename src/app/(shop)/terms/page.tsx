import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/lib/db/mongoose";
import LegalPageModel from "@/lib/db/models/legal-page.model";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import type { LegalPage } from "@/types";

export const metadata: Metadata = {
  title: "Terms & Conditions | Prakash Supermarket",
  description:
    "Read the Terms & Conditions governing your use of Prakash Supermarket — including order policy, delivery, returns, payments, and your legal rights.",
};

export const revalidate = 3600;

async function getTermsPage(): Promise<LegalPage | null> {
  try {
    await connectDB();
    const page = await LegalPageModel.findOne({ slug: "terms", isPublished: true }).lean<LegalPage>();
    return page ?? null;
  } catch {
    return null;
  }
}

export default async function TermsPage() {
  const page = await getTermsPage();
  if (!page) notFound();

  return (
    <LegalPageLayout
      page={page}
      icon="file"
      relatedSlug="privacy"
      relatedLabel="Privacy Policy"
    />
  );
}
