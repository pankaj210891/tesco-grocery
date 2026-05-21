import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/lib/db/mongoose";
import LegalPageModel from "@/lib/db/models/legal-page.model";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import type { LegalPage } from "@/types";

export const metadata: Metadata = {
  title: "Privacy Policy | Prakash Supermarket",
  description:
    "Learn how Prakash Supermarket collects, uses, and protects your personal data in accordance with the Digital Personal Data Protection Act, 2023.",
};

export const revalidate = 3600;

async function getPrivacyPage(): Promise<LegalPage | null> {
  try {
    await connectDB();
    const page = await LegalPageModel.findOne({ slug: "privacy", isPublished: true }).lean<LegalPage>();
    return page ?? null;
  } catch {
    return null;
  }
}

export default async function PrivacyPage() {
  const page = await getPrivacyPage();
  if (!page) notFound();

  return (
    <LegalPageLayout
      page={page}
      icon="shield"
      relatedSlug="terms"
      relatedLabel="Terms & Conditions"
    />
  );
}
