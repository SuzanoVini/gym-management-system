import Image from 'next/image';
import { brand } from '@/lib/brand';

interface BrandLogoProps {
  className?: string;
  width: number;
  height: number;
}

// The configured logo, or the gym's name as a text wordmark when none is set.
export default function BrandLogo({ className, width, height }: BrandLogoProps) {
  if (!brand.logoUrl) {
    return (
      <span
        className="font-extrabold tracking-tight text-red-600 text-2xl whitespace-nowrap px-2"
        title="Set NEXT_PUBLIC_BRAND_LOGO_URL to show your logo here"
      >
        {brand.name}
      </span>
    );
  }
  return (
    <Image
      src={brand.logoUrl}
      alt={brand.name}
      className={className}
      width={width}
      height={height}
      // Hosted logos can live on any domain; skipping optimization avoids
      // having to allow-list that domain in next.config.
      unoptimized
      priority
    />
  );
}
