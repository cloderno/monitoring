import { ShoppingCart } from 'lucide-react';

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <span className="brand-mark" aria-hidden>
      <ShoppingCart size={size} strokeWidth={2.4} />
    </span>
  );
}

export const initials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
