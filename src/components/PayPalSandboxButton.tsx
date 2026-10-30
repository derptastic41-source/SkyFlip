import React, { useEffect, useRef, useState } from 'react';

type Config = { clientId: string; planId: string } | null;
declare global { interface Window { paypal?: any } }
export function PayPalSandboxButton({ config, onVerified, onError }: {
  config: Config; onVerified: () => void; onError: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!config || !container.current) return;
    let cancelled = false;
    const node = container.current;
    node.replaceChildren();
    const src = `https://www.sandbox.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&vault=true&intent=subscription&currency=CAD`;
    const render = () => {
      if (cancelled || !window.paypal || !node.isConnected) return;
      window.paypal.Buttons({
        style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
        createSubscription: (_data: any, actions: any) => actions.subscription.create({ plan_id: config.planId }),
        onApprove: async (data: any) => {
          setStatus('Verifying subscription with PayPal Sandbox...');
          try {
            const response = await fetch('/api/billing/verify', { method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionId: data.subscriptionID }) });
            const result = await response.json();
            if (!response.ok || !result.premium) throw new Error(result.error || 'Subscription not active yet');
            setStatus('Sandbox Premium activated'); onVerified();
          } catch (err: any) { setStatus('Verification pending or failed'); onError(err.message || String(err)); }
        },
        onError: (err: any) => { setStatus('PayPal Sandbox error'); onError(String(err)); }
      }).render(node);
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-skyflip-paypal-sandbox]');
    if (!script) { script = document.createElement('script'); script.src = src; script.async = true;
      script.dataset.skyflipPaypalSandbox = '1'; document.head.appendChild(script); }
    if (window.paypal) render(); else script.addEventListener('load', render, { once: true });
    return () => { cancelled = true; script?.removeEventListener('load', render); node.replaceChildren(); };
  }, [config?.clientId, config?.planId]);
  if (!config) return <p className="text-amber-300">PayPal Sandbox is not configured yet. See README-PAYPAL-SANDBOX.md.</p>;
  return <div><p className="mb-2 text-amber-300">TEST MODE — fake money only</p><div ref={container} />{status && <p className="mt-2">{status}</p>}</div>;
}
