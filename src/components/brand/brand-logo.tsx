import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  width?: number;
  priority?: boolean;
};

export function BrandLogo({ href = "/", className, width = 185, priority = false }: BrandLogoProps) {
  const logo = (
    <Image
      src="/brand/advibe-logo.png"
      alt="AdVibe — Your Brand. Everywhere."
      width={width}
      height={Math.round(width * 682 / 2048)}
      priority={priority}
      className={cn("block h-auto max-w-full object-contain", className)}
    />
  );
  return href ? <Link href={href} className="inline-flex shrink-0 items-center rounded focus-visible:outline-offset-4">{logo}</Link> : logo;
}
