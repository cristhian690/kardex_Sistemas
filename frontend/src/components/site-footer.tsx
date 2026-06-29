import { Activity, ShieldCheck } from "lucide-react"

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm tracking-tight text-foreground">Kardex System</span>
            <span className="text-sm text-muted-foreground ml-1">&copy; {currentYear}</span>
          </div>
          
          <span className="text-border opacity-50 hidden sm:inline-block">•</span>
          
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-default hover:text-foreground transition-colors" title="Sistema con trazabilidad y seguridad">
            <ShieldCheck className="h-4 w-4 text-emerald-500/80" />
            Auditoría Segura
          </span>
        </div>
      </div>
    </footer>
  )
}
