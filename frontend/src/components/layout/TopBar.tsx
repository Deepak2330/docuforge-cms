'use client';

import { useRouter } from 'next/navigation';
import { Bell, LogOut, User as UserIcon, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { User } from '@/types';
import { getInitials } from '@/lib/utils';

interface TopBarProps {
  user: User;
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Call backend logout
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('docuforge_access_token='))
        ?.split('=')[1];

      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Clear session cookies
      await fetch('/api/auth/logout', { method: 'POST' });

      toast({ title: 'Signed out', description: 'You have been signed out successfully.' });
      router.push('/login');
      router.refresh();
    } catch {
      // Even if backend fails, clear local session
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          DocuForge CMS
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white font-bold">
            0
          </span>
        </Button>

        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer hover:bg-accent transition-colors">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="text-left">
              <p className="text-xs font-medium leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
