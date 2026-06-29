"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { HelpCenterModal } from "@/components/HelpCenterModal"
import { HelpCircle, Bell, User, LogOut, Settings } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContex"
import toast from "react-hot-toast"

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [helpOpen, setHelpOpen] = React.useState(false)
  
  const { user, logout } = useAuth()
  const userName = user?.nombre_completo || user?.username || "Invitado"
  const userEmail = user?.email || "user@example.com"
  const userInitial = userName[0]?.toUpperCase() || "I"

  const handleLogout = () => {
    if (window.confirm("¿Seguro que deseas cerrar sesión?")) {
      toast.success("Sesión cerrada")
      logout()
    }
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sticky top-0 z-50">
        <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-5"
          />
          <div className="flex-1 max-w-md">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
          </div>
          
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button
              id="tour-help-center"
              variant="ghost"
              size="sm"
              onClick={() => setHelpOpen(true)}
              className="gap-1.5 hidden sm:flex text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
              Ayuda
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground relative"
              title="Notificaciones"
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notificaciones</span>
              {/* Indicador de notificación (Puntito rojo) */}
              <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-rose-500 border border-background"></span>
            </Button>
            
            <ModeToggle />
            
            <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 ml-1 transition-colors">
                  <span className="font-semibold text-primary text-xs">{userInitial}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 transition-colors">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <HelpCenterModal open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
