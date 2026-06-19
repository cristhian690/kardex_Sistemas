"use client"

import { EllipsisVertical, LogOut, Layers } from "lucide-react"
import { useAuth } from "@/context/AuthContex" // Tu contexto de sesión activo
import toast from "react-hot-toast"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser() {
  const { user, logout } = useAuth()
  const { isMobile } = useSidebar()

  // Extraemos tus propiedades reales mapeando valores por defecto si no hay sesión
  const userName = user?.nombre_completo || user?.username || "Invitado"
  const userRole = user?.rol || "Usuario"
  const userEmail = user?.email || "user@example.com"

  const handleLogout = () => {
    if (window.confirm("¿Seguro que deseas cerrar sesión?")) {
      toast.success("Sesión cerrada")
      logout()
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer rounded-xl border border-transparent hover:border-sidebar-border/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent border border-sidebar-border text-sidebar-foreground">
                <Layers className="size-4 text-sidebar-foreground/70" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-sidebar-foreground">
                  {userName}
                </span>
                <span className="text-muted-foreground/80 truncate text-[11px] font-medium uppercase tracking-wider">
                  {userRole}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent
            className="w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs">
                  {userName[0].toUpperCase()}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2">
              <LogOut className="size-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}