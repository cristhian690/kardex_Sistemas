"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Boxes,
  ArrowUpDown,
  Workflow,
  ClipboardList,
  Archive,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Logo } from "@/components/logo"
import { SidebarNotification } from "@/components/sidebar-notification"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
  user: {
    name: "Admin",
    email: "user@example.com",
    avatar: "",
  },
  navGroups: [
    {
      label: "Principal",
      items: [
        {
          title: "Dashboard",
          url: "/",
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
          title: "Movimientos",
          url: "kardex/:procesamiento_id",
          icon: ArrowUpDown,
          disabled: true,
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
          icon: Boxes,
        },
        {
          title: "Empresas",
          url: "/empresas",
          icon: Boxes,
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
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Sistema Kardex</span>
                  <span className="truncate text-xs">Admin Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNotification />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
