import Image from "next/image";

import { APP_LOGO, APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: "sm" | "lg";
  className?: string;
};

const SIZES = {
  sm: { box: "size-8", pixels: 32, rounded: "rounded-lg" },
  lg: { box: "size-14", pixels: 56, rounded: "rounded-2xl" },
} as const;

export function AppLogo({ size = "sm", className }: AppLogoProps) {
  const dimensions = SIZES[size];

  return (
    <Image
      src={APP_LOGO}
      alt={`${APP_NAME} logo`}
      width={dimensions.pixels}
      height={dimensions.pixels}
      className={cn(dimensions.box, dimensions.rounded, "object-cover", className)}
      priority
    />
  );
}
