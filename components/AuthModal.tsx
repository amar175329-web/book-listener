'use client';

import React, { useState } from 'react';
import { User, Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import { X, LogIn, UserPlus, AlertCircle, BookOpen } from 'lucide-react';

interface Props {
  lang: Language;
  onClose: () => void;
  onSuccess: (user: User, token: string, isNewUser: boolean) => void;
}

export function AuthModal({ lang = 'en', onClose, onSuccess }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister 
        ? { email, password, name, languagePreference: lang } 
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('bl_token', data.token);
      onSuccess(data.user, data.token, isRegister);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#161B22] rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
              {t('app_name', lang)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isRegister
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {lang === 'hi' ? 'साइन इन करें' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRegister
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {lang === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {lang === 'hi' ? 'आपका नाम' : 'Your Full Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Aurelius"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {lang === 'hi' ? 'ईमेल' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reader@booklistener.app"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              {lang === 'hi' ? 'पासवर्ड' : 'Password'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{lang === 'hi' ? 'खाता बनाएं और शुरू करें' : 'Create Account & Begin'}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{lang === 'hi' ? 'साइन इन करें' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* Disclaimer / Boundary */}
        <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center mt-6 leading-normal">
          {lang === 'hi'
            ? 'आपकी पढ़ने और सुनने की प्रगति आपके खाते में सुरक्षित रहती है।'
            : 'Your personal listening history and preference profile persist across sessions.'}
        </p>
      </div>
    </div>
  );
}
