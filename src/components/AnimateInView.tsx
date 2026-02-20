'use client';

import { useEffect, useRef, useState } from 'react';

type AnimateInViewProps = {
  children: React.ReactNode;
  className?: string;
  rootMargin?: string;
  threshold?: number;
};

/**
 * Wraps content and animates it when it enters the viewport.
 * Add .animate-on-visible and .stagger-* to children for staggered fade-in-up.
 * @param props - Component props.
 * @param props.children - Content to animate.
 * @param props.className - Optional CSS classes for the wrapper.
 * @param props.rootMargin - IntersectionObserver rootMargin (default: '0px 0px -8% 0px').
 * @param props.threshold - IntersectionObserver threshold (default: 0.1).
 */
export function AnimateInView(props: AnimateInViewProps) {
  const { children, className = '', rootMargin = '0px 0px -8% 0px', threshold = 0.1 } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div
      ref={ref}
      className={`animate-in-view ${visible ? 'visible' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
