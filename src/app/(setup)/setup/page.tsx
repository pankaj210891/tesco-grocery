import type { Metadata } from "next";
import SetupWizard from "./SetupWizard";

export const metadata: Metadata = {
  title: "Install Wizard — Prakash Supermarket",
};

export default function SetupPage() {
  return <SetupWizard />;
}
