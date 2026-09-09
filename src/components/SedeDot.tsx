import React from "react";
import { cn } from "@/lib/utils";

interface SedeDotProps {
  color: string;
  className?: string;
}

const SedeDot: React.FC<SedeDotProps> = ({ color, className }) => (
  <span
    className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
    style={{ backgroundColor: color }}
    aria-hidden
  />
);

export default SedeDot;
