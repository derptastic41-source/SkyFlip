import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { LockKeyhole, Mail, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';

type Mode = 'login' | 'register' | 'reset';

export function AccountAuth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setMessage('If this address has an account, a password reset email will arrive shortly.');
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/` } });
        if (error) throw error;
        if (data.session) onAuthenticated();
        else setMessage('Check your inbox to confirm your email, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#0b0f17] text-slate-200 flex items-center justify-center p-5">
    <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-[#121824] p-8 shadow-2xl">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><ShieldCheck size={26}/></div>
        <h1 className="text-3xl font-bold tracking-tight text-white">SkyFlip <span className="text-amber-400">AH</span></h1>
        <p className="mt-2 text-sm text-slate-400">{mode === 'register' ? 'Create your SkyFlip account' : mode === 'reset' ? 'Reset your account password' : 'Sign in to your SkyFlip account'}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-300">Email address
          <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3"><Mail size={16} className="text-slate-500"/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-transparent py-3 text-sm text-white outline-none" /></span>
        </label>
        {mode !== 'reset' && <label className="block text-xs font-semibold text-slate-300">Password
          <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3"><LockKeyhole size={16} className="text-slate-500"/><input type="password" required minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="w-full bg-transparent py-3 text-sm text-white outline-none" /></span>
        </label>}
        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">{message}</p>}
        <button disabled={busy} type="submit" className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Log in'}</button>
      </form>
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-amber-400">
        {mode !== 'login' && <button onClick={()=>{setMode('login');setError('');setMessage('');}} className="flex items-center gap-1"><ArrowLeft size={13}/> Back to login</button>}
        {mode === 'login' && <><button onClick={()=>{setMode('register');setError('');setMessage('');}}>Create an account</button><button onClick={()=>{setMode('reset');setError('');setMessage('');}}>Forgot password?</button></>}
      </div>
    </div>
  </main>;
}

export function AccountSettings({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : 'Password updated successfully.');
    if (!error) setPassword('');
    setBusy(false);
  };
  return <main className="mx-auto w-full max-w-2xl flex-1 p-6 text-slate-200">
    <button onClick={onClose} className="mb-6 flex items-center gap-2 text-sm text-amber-400"><ArrowLeft size={16}/> Back to SkyFlip</button>
    <h1 className="mb-5 text-2xl font-bold text-white">Account settings</h1>
    <div className="space-y-5 rounded-xl border border-slate-700 bg-[#121824] p-6">
      <div><p className="text-xs text-slate-400">Email address</p><p className="mt-1 font-medium">{user.email}</p></div>
      <div><p className="text-xs text-slate-400">Email verification</p><p className="mt-1 text-sm">{user.email_confirmed_at ? 'Verified' : 'Not verified'}</p></div>
      <div><p className="text-xs text-slate-400">Membership</p><p className="mt-1 text-sm">Free — Premium subscriptions are not connected yet</p></div>
      <form onSubmit={updatePassword} className="border-t border-slate-700 pt-5">
        <label className="block text-sm font-medium">Change password<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" placeholder="New password (6+ characters)"/></label>
        <button disabled={busy} type="submit" className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Update password</button>
        {message && <p role="status" className="mt-3 text-sm text-slate-300">{message}</p>}
      </form>
      <button onClick={async()=>{await supabase?.auth.signOut();}} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"><LogOut size={16}/> Log out</button>
    </div>
  </main>;
}
