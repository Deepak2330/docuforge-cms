'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

interface GoogleConfig {
  enabled: boolean;
  clientId: string | null;
}

async function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return;

  const existing = document.getElementById('google-gsi-script');
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), {
        once: true,
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({ mode = 'signin' }: GoogleSignInButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<GoogleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const handleCredential = useCallback(
    async (credential?: string) => {
      if (!credential) return;
      setSigningIn(true);
      try {
        const loginRes = await fetch('/api/v1/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: credential }),
        });
        const loginJson = await loginRes.json();
        if (!loginRes.ok) {
          const message = Array.isArray(loginJson.message)
            ? loginJson.message.join(', ')
            : loginJson.message || 'Unable to verify Google account';
          toast({
            variant: 'destructive',
            title: 'Google sign-in failed',
            description: message,
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
    [mode, router, searchParams, toast],
  );

  // Phase 1: fetch config + load GIS script
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const res = await fetch('/api/v1/auth/google/config');
        const json = await res.json();
        const data = (json.data ?? json) as GoogleConfig;
        if (cancelled) return;

        if (!data?.enabled || !data?.clientId) {
          setConfig({ enabled: false, clientId: null });
          return;
        }

        setConfig({ enabled: true, clientId: data.clientId });
        await loadGoogleScript();
        if (!cancelled) setScriptReady(true);
      } catch {
        if (!cancelled) setConfig({ enabled: false, clientId: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 2: render Google button only after the mount point exists
  useEffect(() => {
    if (!config?.enabled || !config.clientId || !scriptReady || !buttonRef.current) return;
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: (response: { credential?: string }) => {
        void handleCredential(response.credential);
      },
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    buttonRef.current.innerHTML = '';
    // filled_black matches the slate auth cards better than the default white outline button
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: mode === 'signup' ? 'signup_with' : 'signin_with',
      shape: 'rectangular',
      width: buttonRef.current.offsetWidth || 352,
      logo_alignment: 'left',
    });
  }, [config, scriptReady, mode, handleCredential]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2 text-slate-400 text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Google sign-in…
      </div>
    );
  }

  if (!config?.enabled) return null;

  return (
    <div className="w-full space-y-3 pt-1">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-600/80" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-600/80" />
      </div>

      <div
        className={[
          'w-full rounded-md border border-slate-600 bg-slate-900/40 p-1',
          'shadow-sm transition-opacity',
          signingIn ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {signingIn && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in with Google…
          </div>
        )}
        <div
          ref={buttonRef}
          className={['flex w-full justify-center', signingIn ? 'hidden' : ''].join(' ')}
          aria-label={mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
        />
      </div>
    </div>
  );
}
