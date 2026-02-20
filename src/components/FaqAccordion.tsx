'use client';

import { useState } from 'react';

export type FaqItem = { q: string; a: string };

/**
 * Accordion for FAQ items. One item open at a time.
 * @param props - Component props.
 * @param props.items - List of FAQ entries with question (q) and answer (a).
 */
export function FaqAccordion(props: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-12 space-y-2 sm:mt-16">
      {props.items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.q}
            className="animate-on-visible overflow-hidden rounded-xl border border-zinc-300/80 bg-slate-50/95 shadow-sm transition-all duration-200 hover:border-zinc-400"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${i}`}
              id={`faq-question-${i}`}
            >
              <span>{item.q}</span>
              <span
                className={`shrink-0 text-emerald-600 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            <div
              id={`faq-answer-${i}`}
              role="region"
              aria-labelledby={`faq-question-${i}`}
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p
                  className={`border-t border-zinc-200 px-5 py-4 leading-relaxed text-slate-600 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                >
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
