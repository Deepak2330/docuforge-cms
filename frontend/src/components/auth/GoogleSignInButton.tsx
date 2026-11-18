'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
}

export function GoogleSignInButton({ mode = 'signin' }: GoogleSignInButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const res = await fetch('/api/v1/auth/google/config');
        const json = await res.json();
        const data = json.data ?? json;
        if (cancelled) return;

        if (!data?.enabled || !data?.clientId) {
          setEnabled(false);
          setLoading(false);
          return;
        }

        setEnabled(true);

        await new Promise<void>((resolve, reject) => {
          if (window.google?.accounts?.id) {
            resolve();
            return;
          }
          const existing = document.getElementById('google-gsi-script');
          if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
            return;
          }
          const script = document.createElement('script');
          script.id = 'google-gsi-script';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google script'));
          document.head.appendChild(script);
        });

        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: data.clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            setSigningIn(true);
            try {
              const loginRes = await fetch('/api/v1/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: response.credential }),
              });
              const loginJson = await loginRes.json();
              if (!loginRes.ok) {
                toast({
                  variant: 'destructive',
                  title: 'Google sign-in failed',
                  description: loginJson.message || 'Unable to verify Google account',
                });
                return;
              }

              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginJson.data),
              });

              toast({
                title: mode === 'signup' ? 'Welcome!' : 'Welcome back!',
                description: `Signed in as ${loginJson.data?.user?.firstName || 'Google user'}`,
              });

              const from = searchParams.get('from') || '/dashboard';
              router.push(from);
              router.refresh();
            } catch {
              toast({
                variant: 'destructive',
                title: 'Connection error',
                description: 'Unable to complete Google sign-in. Please try again.',
              });
            } finally {
              setSigningIn(false);
            }
          },
          ux_mode: 'popup',
          auto_select: false,
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width: 320,
          logo_alignment: 'left',
        });
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [mode, router, searchParams, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2 text-slate-400 text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Google sign-in…
      </div>
    );
  }

  if (!enabled) return null;

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-600" />
        <span className="text-xs uppercase tracking-wide text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-600" />
      </div>
      <div className="flex flex-col items-center gap-2">
        {signingIn && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in with Google…
          </div>
        )}
        <div ref={buttonRef} className={signingIn ? 'pointer-events-none opacity-60' : ''} />
      </div>
    </div>
  );
}
