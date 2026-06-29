"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Command as CommandPrimitive } from "cmdk"
import {
  Search,
  LayoutDashboard,
  Boxes,
  ArrowUpDown,
  Workflow,
  ClipboardList,
  Archive,
  Lock,
  BookOpen,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-12 w-full border-none bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 mb-4",
      className
    )}
    {...props}
  />
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[400px] overflow-y-auto overflow-x-hidden pb-2", className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="flex h-12 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400"
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 dark:[&_[cmdk-group-heading]]:text-zinc-400 [&:not(:first-child)]:mt-2",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex h-12 cursor-pointer select-none items-center gap-2 rounded-lg px-4 text-sm text-zinc-700 dark:text-zinc-300 outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-900 dark:data-[selected=true]:text-zinc-100 data-[disabled=true]:opacity-50 [&+[cmdk-item]]:mt-1",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

interface SearchItem {
  title: string
  url: string
  group: string
  icon?: LucideIcon
  disabled?: boolean
}

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate()
  const commandRef = React.useRef<HTMLDivElement>(null)

  const [ultimoId, setUltimoId] = React.useState<string | null>(null)
  const [tieneProcesamiento, setTieneProcesamiento] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      const id = localStorage.getItem('ultimo_procesamiento_id')
      setUltimoId(id)
      setTieneProcesamiento(!!id)
    }
  }, [open])

  const searchItems: SearchItem[] = [
    // Principal
    { 
      title: "Dashboard", 
      url: tieneProcesamiento ? `/kardex/${ultimoId}` : "#", 
      group: "Principal", 
      icon: LayoutDashboard,
      disabled: !tieneProcesamiento
    },
    { title: "Procesar Archivos", url: "/", group: "Principal", icon: Workflow },
    { title: "Historial de Actividad", url: "/historial", group: "Principal", icon: ClipboardList },

    // Análisis
    { 
      title: "Movimientos del Kardex", 
      url: tieneProcesamiento ? `/kardex/${ultimoId}` : "#", 
      group: "Análisis", 
      icon: ArrowUpDown,
      disabled: !tieneProcesamiento
    },

    // Registro / Sistema
    { title: "Saldos Iniciales", url: "/saldos", group: "Registro / Catálogo", icon: Archive },
    { title: "Maestro de Productos", url: "/productos", group: "Registro / Catálogo", icon: Boxes },
    { title: "Configuración de Empresas", url: "/empresas", group: "Registro / Catálogo", icon: Boxes },

    // Ayuda
    { title: "Guía de Usuario", url: "/guia-inconsistencias", group: "Ayuda", icon: BookOpen },
    { title: "Soporte Técnico", url: "/manual", group: "Ayuda", icon: LifeBuoy },
  ]

  const groupedItems = searchItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, SearchItem[]>)

  const handleSelect = (item: SearchItem) => {
    if (item.disabled) return

    navigate(item.url)
    onOpenChange(false)
    
    // Bounce effect like Vercel
    if (commandRef.current) {
      commandRef.current.style.transform = 'scale(0.96)'
      setTimeout(() => {
        if (commandRef.current) {
          commandRef.current.style.transform = ''
        }
      }, 100)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-w-[640px]">
        <DialogTitle className="sr-only">Command Search</DialogTitle>
        <Command
          ref={commandRef}
          className="transition-transform duration-100 ease-out"
        >
          <CommandInput placeholder="¿Qué necesitas buscar?" autoFocus />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            {Object.entries(groupedItems).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.title + item.url}
                      value={item.title}
                      onSelect={() => handleSelect(item)}
                      disabled={item.disabled}
                      className={cn(
                        "flex items-center justify-between",
                        item.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                      )}
                    >
                      <div className="flex items-center">
                        {Icon && <Icon className="mr-2 h-4 w-4 shrink-0" />}
                        <span>{item.title}</span>
                      </div>
                      
                      {item.disabled && (
                        <Lock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600 mr-1" />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1 relative w-full justify-start text-muted-foreground sm:pr-12 md:w-36 lg:w-56"
    >
      <Search className="mr-2 h-3.5 w-3.5" />
      <span className="hidden lg:inline-flex">Buscar...</span>
      <span className="inline-flex lg:hidden">Buscar...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}
