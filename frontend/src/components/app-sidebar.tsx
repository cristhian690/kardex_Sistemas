"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  Building2,
  ArrowUpDown,
  Workflow,
  ClipboardList,
  Archive,
  BookOpen,
  LifeBuoy,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Logo } from "@/components/logo"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navGroups: [
    {
      label: "Principal",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Procesar",
          url: "/",
          icon: Workflow,
        },
        {
          title: "Historial",
          url: "/historial",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Análisis",
      items: [
        {
          title: "Último Procesamiento",
          url: "/kardex/ultimo",
          icon: ArrowUpDown,
        },
      ],
    },
    {
      label: "Registro",
      items: [
        {
          title: "Saldos Iniciales",
          url: "/saldos",
          icon: Archive,
        },
        {
          title: "Productos",
          url: "/productos",
          icon: Package,
        },
        {
          title: "Empresas",
          url: "/empresas",
          icon: Building2,
        },
      ],
    },
    {
      label: "Ayuda",
      items: [
        {
          title: "Guía Inconsistencias",
          url: "/guia-inconsistencias",
          icon: BookOpen,
          badge: "NUEVO",
        },
        {
          title: "Centro de Soporte",
          url: "/manual",
          icon: LifeBuoy,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold tracking-tight">Kardex System</span>
                  <span className="truncate text-xs text-muted-foreground font-medium">Panel de Control</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0 pt-4">
        {data.navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      {/* Perfil de usuario (NavUser) eliminado para no duplicar la cabecera */}
      <SidebarFooter className="pb-4">
        <div className="px-4 text-[10px] text-muted-foreground/50 font-medium text-center uppercase tracking-widest">
          Kardex System © {new Date().getFullYear()}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
