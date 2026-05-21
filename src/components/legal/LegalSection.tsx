import { Info } from "lucide-react";
import type { LegalSection as ILegalSection, ContentBlock } from "@/types";

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[15px]">
          {block.text}
        </p>
      );

    case "subheading":
      return (
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
          {block.text}
        </h4>
      );

    case "highlight":
      return (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-[14px] text-amber-800 dark:text-amber-300 leading-relaxed">
            {block.text}
          </p>
        </div>
      );

    case "bulletList":
      return (
        <ul className="space-y-2 pl-1">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      );

    case "numberedList":
      return (
        <ol className="space-y-2.5 pl-1">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      );

    default:
      return null;
  }
}

interface LegalSectionProps {
  section: ILegalSection;
}

export function LegalSection({ section }: LegalSectionProps) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        {section.title}
      </h2>
      <div className="space-y-4">
        {section.blocks.map((block, i) => (
          <ContentBlockRenderer key={i} block={block} />
        ))}
      </div>
    </section>
  );
}
