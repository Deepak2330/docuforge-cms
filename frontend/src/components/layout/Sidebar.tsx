'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Code2,
  GitBranch,
  Tag,
  FileEdit,
  Users,
  Settings,
  ScrollText,
  BookOpen,
  Search,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

const navItems = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/workspaces', label: 'Workspaces', icon: FolderOpen },
      { href: '/projects', label: 'Projects', icon: BookOpen },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/documents', label: 'Documentation', icon: FileText },
      { href: '/api-reference', label: 'API Reference', icon: Code2 },
      { href: '/graphql', label: 'GraphQL', icon: GitBranch },
      { href: '/categories', label: 'Categories', icon: Tag },
      { href: '/release-notes', label: 'Release Notes', icon: ScrollText },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/team', label: 'Team Management', icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/audit-logs', label: 'Audit Logs', icon: FileEdit },
    ],
  },
];

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-sidebar-foreground">DocuForge</span>
          <span className="block text-xs text-sidebar-foreground/60">CMS</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-sidebar-border rounded px-1 py-0.5">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
