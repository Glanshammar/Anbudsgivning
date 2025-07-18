"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface SliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root> {
  showColorProgress?: boolean;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 10,
  showColorProgress = false,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
        ? defaultValue
        : [min, max],
    [value, defaultValue, min, max]
  );

  // Calculate color based on progress (0-100%)
  const getProgressColor = (progress: number) => {
    if (!showColorProgress) return "bg-primary";

    // Normalize progress to 0-1
    const normalizedProgress = Math.max(0, Math.min(1, progress / 100));

    // Red to green transition
    const red = Math.round(255 * (1 - normalizedProgress));
    const green = Math.round(255 * normalizedProgress);

    return `rgb(${red}, ${green}, 0)`;
  };

  const currentValue = Array.isArray(value)
    ? value[0]
    : Array.isArray(defaultValue)
    ? defaultValue[0]
    : min;
  const progressColor = showColorProgress
    ? getProgressColor(currentValue)
    : undefined;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            showColorProgress ? "" : "bg-primary",
            "absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
          style={progressColor ? { backgroundColor: progressColor } : {}}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
