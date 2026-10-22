'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { Env } from '@/libs/Env';
import { SuspendedPostHogPageView } from './PostHogPageView';

export const PostHogProvider = (props: { children: React.ReactNode }) => {
  useEffect(() => {
    if (Env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(Env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: Env.NEXT_PUBLIC_POSTHOG_HOST,
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually
        capture_pageleave: true, // Enable pageleave capture
      });
    }
  }, []);

  useEffect(() => {
    if (!Env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }

    const captureContact = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const link = event.target.closest('a');
      if (!link || new URL(link.href).hostname !== 'wa.me') {
        return;
      }
      posthog.capture('whatsapp_contact_clicked', {
        page_path: window.location.pathname,
        label: link.getAttribute('aria-label') ?? link.textContent?.trim(),
        placement: link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content',
      });
    };
    document.addEventListener('click', captureContact);
    return () => document.removeEventListener('click', captureContact);
  }, []);

  if (!Env.NEXT_PUBLIC_POSTHOG_KEY) {
    return props.children;
  }

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {props.children}
    </PHProvider>
  );
};
