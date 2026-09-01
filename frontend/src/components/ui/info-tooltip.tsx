import React from "react"
import { Info, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  content: React.ReactNode
  className?: string
  iconClassName?: string
}

export function InfoTooltip({ content, className, iconClassName }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
              className
            )}
          >
            <Info className={cn("h-4 w-4", iconClassName)} />
            <span className="sr-only">Información</span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center" 
          className="max-w-[250px] text-xs leading-relaxed z-[100] relative pointer-events-auto pr-6"
        >
          <button
             onClick={(e) => {
               e.stopPropagation();
               e.preventDefault();
               document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
             }}
             className="absolute top-1.5 right-1.5 text-muted-foreground/60 hover:text-foreground cursor-pointer bg-muted/50 hover:bg-muted/80 rounded-full p-0.5 transition-colors"
          >
             <X className="size-3" />
          </button>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
