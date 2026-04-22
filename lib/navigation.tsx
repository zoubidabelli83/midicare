// lib/navigation.tsx
'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import type { LinkProps } from 'next/link';
import type { ReactNode } from 'react';

interface LocalizedLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  [key: string]: any;
}

export function LocalizedLink({ href, children, ...props }: LocalizedLinkProps) {
  const locale = useLocale();
  
  // Ensure href starts with / and prepend locale
  const cleanHref = href.startsWith('/') ? href : `/${href}`;
  const localizedHref = `/${locale}${cleanHref}`;
  
  return (
    <Link href={localizedHref} {...props}>
      {children}
    </Link>
  );
}