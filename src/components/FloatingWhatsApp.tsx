'use client';

import Link from 'next/link';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

/**
 * Floating WhatsApp button, visible on mobile and tablet. Only renders when NEXT_PUBLIC_WHATSAPP_URL is set.
 */
export function FloatingWhatsApp() {
  const url = process.env.NEXT_PUBLIC_WHATSAPP_URL;

  if (!url || !url.startsWith('http')) {
    return null;
  }

  return (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-[transform,box-shadow] duration-300 hover:scale-110 hover:bg-[#20BD5A] hover:shadow-xl focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:outline-none md:right-8 md:bottom-8 md:h-16 md:w-16"
      aria-label="Abrir WhatsApp"
    >
      <WhatsAppIcon className="size-8 md:size-9" />
    </Link>
  );
}
