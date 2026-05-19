import { cn } from "@/lib/utils";

export const pageContainerClass =
  "max-w-7xl mx-auto w-full min-w-0 space-y-4 sm:space-y-6";

export const pageHeaderClass =
  "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between";

export const mobileDialogClass = cn(
  "!flex !flex-col max-h-[90dvh] overflow-hidden w-[calc(100%-1rem)]",
  "max-sm:left-0 max-sm:right-0 max-sm:w-full max-sm:translate-x-0",
  "max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-t-lg max-sm:rounded-b-none"
);

export const dialogFooterMobileClass = cn(
  "shrink-0 !flex flex-col gap-2 sm:!flex-row sm:justify-end sm:gap-2",
  "border-t pt-3 bg-background pb-[env(safe-area-inset-bottom,0px)]"
);

export const dialogBodyScrollClass = "flex-1 min-h-0 overflow-y-auto";
