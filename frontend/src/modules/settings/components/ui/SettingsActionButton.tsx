import type { ComponentProps } from "react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";

type SettingsActionButtonProps = ComponentProps<typeof Button>;

export function SettingsActionButton({
  className,
  ...props
}: SettingsActionButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "h-auto rounded-md bg-secondary px-4 py-2 text-[18px] leading-6 font-normal text-foreground hover:bg-secondary/80",
        className,
      )}
      {...props}
    />
  );
}
