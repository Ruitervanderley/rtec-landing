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
    <div className="mt-12 space-y-3 sm:mt-16">
      {props.items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.q}
            className="animate-on-visible overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.1]"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${i}`}
              id={`faq-question-${i}`}
            >
              <span>{item.q}</span>
              <span
                className={`shrink-0 text-emerald-500 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
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
                  className={`border-t border-white/[0.06] px-6 py-5 leading-relaxed text-slate-400 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
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
