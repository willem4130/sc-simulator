'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Workflow,
  FolderKanban,
  Activity,
  Clock,
  FileText,
  Receipt,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Mail,
  Send,
  FileUp,
  ClipboardList,
  Bell,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SyncButton } from '@/components/admin/sync-button'
import { cn } from '@/lib/utils'

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type NavSection = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/admin/projects',
    icon: FolderKanban,
  },
  {
    title: 'People',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Hours',
    href: '/admin/hours',
    icon: Clock,
  },
  {
    title: 'Rates',
    href: '/admin/rates',
    icon: DollarSign,
  },
  {
    title: 'Contracts',
    href: '/admin/contracts',
    icon: FileText,
  },
  {
    title: 'Invoices',
    href: '/admin/invoices',
    icon: Receipt,
  },
  {
    title: 'Workflows',
    href: '/admin/workflows',
    icon: Workflow,
  },
]

const automationSection: NavSection = {
  title: 'Automation',
  icon: Activity,
  items: [
    {
      title: 'Logs & Queue',
      href: '/admin/automation',
      icon: Activity,
    },
    {
      title: 'Email Templates',
      href: '/admin/email/templates',
      icon: Mail,
    },
    {
      title: 'Sent Emails',
      href: '/admin/email/sent',
      icon: Send,
    },
    {
      title: 'Documents',
      href: '/admin/email/documents',
      icon: FileUp,
    },
    {
      title: 'Hours Reports',
      href: '/admin/email/hours-reports',
      icon: ClipboardList,
    },
    {
      title: 'Hours Reminders',
      href: '/admin/email/hours-reminders',
      icon: Bell,
    },
  ],
}

const settingsItem: NavItem = {
  title: 'Settings',
  href: '/admin/settings',
  icon: Settings,
}

const helpItem: NavItem = {
  title: 'Help',
  href: '/admin/help',
  icon: HelpCircle,
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [automationExpanded, setAutomationExpanded] = useState(() => {
    // Auto-expand if we're on an automation page
    return pathname.startsWith('/admin/automation') || pathname.startsWith('/admin/email')
  })

  // Check if any automation sub-item is active
  const isAutomationActive = automationSection.items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="text-lg">Admin Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {/* Main nav items */}
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3',
                      isActive && 'bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              )
            })}

            {/* Automation Section (expandable) */}
            <div className="pt-2">
              <Button
                variant={isAutomationActive && !automationExpanded ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isAutomationActive && !automationExpanded && 'bg-accent'
                )}
                onClick={() => setAutomationExpanded(!automationExpanded)}
              >
                <automationSection.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{automationSection.title}</span>
                {automationExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {/* Sub-items */}
              {automationExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                  {automationSection.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'w-full justify-start gap-2 text-sm',
                            isActive && 'bg-accent'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.title}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="pt-2">
              <Link href={settingsItem.href}>
                <Button
                  variant={pathname === settingsItem.href ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    pathname === settingsItem.href && 'bg-accent'
                  )}
                >
                  <settingsItem.icon className="h-4 w-4" />
                  {settingsItem.title}
                </Button>
              </Link>
            </div>

            {/* Help */}
            <div className="pt-1">
              <Link href={helpItem.href}>
                <Button
                  variant={pathname === helpItem.href ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    pathname === helpItem.href && 'bg-accent'
                  )}
                >
                  <helpItem.icon className="h-4 w-4" />
                  {helpItem.title}
                </Button>
              </Link>
            </div>
          </nav>

          <Separator />

          {/* User Profile */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://github.com/shadcn.png" alt="Admin" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">Admin User</span>
                    <span className="text-xs text-muted-foreground">admin@example.com</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        {/* Top Header with Sync Button */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SyncButton />
        </header>
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
