'use client';

import { useEffect, useState } from 'react';

/**
 * Back-to-top button that appears after scrolling down. Fades in/out for a smoother UX.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 400);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-400 bg-slate-100/95 text-slate-600 shadow-md backdrop-blur-sm transition-[transform,opacity,box-shadow] duration-300 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none md:bottom-8 md:left-8"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-label="Voltar ao topo"
      aria-hidden={!visible}
    >
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}
