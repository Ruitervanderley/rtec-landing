'use client';

import Link from 'next/link';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

/**
 * Floating WhatsApp button for quick contact on smaller screens.
 * @param props - Component props.
 * @param props.label - Accessible label for assistive technologies.
 * @param props.url - Destination URL for the WhatsApp conversation.
 */
export function FloatingWhatsApp(props: { label: string; url?: string }) {
  if (!props.url || !props.url.startsWith('http')) {
    return null;
  }

  return (
    <Link
      href={props.url}
      target="_blank"
      rel="noreferrer noopener"
      className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-[transform,box-shadow] duration-300 hover:scale-110 hover:bg-[#20BD5A] hover:shadow-xl focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:outline-none md:right-8 md:bottom-8 md:h-16 md:w-16"
      aria-label={props.label}
    >
      <WhatsAppIcon className="size-8 md:size-9" />
    </Link>
  );
}
