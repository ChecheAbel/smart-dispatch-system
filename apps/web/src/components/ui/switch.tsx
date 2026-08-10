"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-slate-200 p-0.5 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-[#1C3A34] dark:border-white/10 dark:bg-[#303844] dark:focus-visible:border-[#C9B87A] dark:focus-visible:ring-[#C9B87A]/30 dark:data-checked:border-[#C9B87A] dark:data-checked:bg-[#C9B87A]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-checked:translate-x-5 dark:bg-[#dfe5eb] dark:data-checked:bg-[#151a21]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
