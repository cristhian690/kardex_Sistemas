"use client"

import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-end gap-2 border-b px-4 lg:px-6">
      <ModeToggle />
    </header>
  )
}