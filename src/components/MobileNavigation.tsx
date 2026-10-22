'use client';

import { useEffect, useRef } from 'react';

export function MobileNavigation(props: { label: string; navigationLabel: string; children: React.ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const element = details.current;
    if (!element) {
      return;
    }
    const closeOnNavigation = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a')) {
        element.removeAttribute('open');
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        element.removeAttribute('open');
        element.querySelector('summary')?.focus();
      }
    };
    element.addEventListener('click', closeOnNavigation);
    element.addEventListener('keydown', closeOnEscape);
    return () => {
      element.removeEventListener('click', closeOnNavigation);
      element.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <details
      ref={details}
      className="group ml-auto xl:hidden"
    >
      <summary className="cursor-pointer rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-emerald-400">
        {props.label}
      </summary>
      <nav aria-label={props.navigationLabel} className="absolute inset-x-0 top-full max-h-[75dvh] overflow-y-auto border-b border-white/10 bg-[#0b1121] p-4 shadow-xl">
        <ul className="mx-auto flex max-w-6xl flex-col gap-2 text-base text-slate-200">{props.children}</ul>
      </nav>
    </details>
  );
}
