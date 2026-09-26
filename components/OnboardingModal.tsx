'use client';

import React, { useState } from 'react';
import { Theme, Language } from '@/lib/types';
import { THEMES, t } from '@/lib/i18n';
import {
  Sparkles,
  Crosshair,
  Repeat,
  Shield,
  Zap,
  Award,
  Coins,
  Users,
  BookOpen,
  Check,
  AlertCircle
} from 'lucide-react';

interface Props {
  lang: Language;
  token?: string | null;
  onComplete: (selectedThemes: string[]) => void;
  onClose?: () => void;
  initialSelected?: string[];
}

export function OnboardingModal({
  lang = 'en',
  token,
  onComplete,
  onClose,
  initialSelected = []
}: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getThemeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crosshair':
        return <Crosshair className="w-5 h-5" />;
      case 'Repeat':
        return <Repeat className="w-5 h-5" />;
      case 'Shield':
        return <Shield className="w-5 h-5" />;
      case 'Zap':
        return <Zap className="w-5 h-5" />;
      case 'Award':
        return <Award className="w-5 h-5" />;
      case 'Coins':
        return <Coins className="w-5 h-5" />;
      case 'Users':
        return <Users className="w-5 h-5" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const toggleTheme = (themeId: string) => {
    setError(null);
    if (selected.includes(themeId)) {
      setSelected(selected.filter((id) => id !== themeId));
    } else {
      if (selected.length >= 5) {
        setError(lang === 'hi' ? 'आप अधिकतम 5 विषय चुन सकते हैं।' : 'You can select up to 5 themes.');
        return;
      }
      setSelected([...selected, themeId]);
    }
  };

  const handleSave = async () => {
    if (selected.length < 3) {
      setError(t('onboarding_min_warning', lang));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (token) {
        await fetch('/api/onboarding/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ themes: selected, languagePreference: lang })
        });
      }

      onComplete(selected);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#161B22] rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="text-center max-w-md mx-auto mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-stone-900 dark:text-stone-100">
              {t('onboarding_title', lang)}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">
              {t('onboarding_subtitle', lang)}
            </p>
          </div>

          {/* Theme Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[48vh] overflow-y-auto pr-1">
            {THEMES.map((theme) => {
              const isSelected = selected.includes(theme.id);
              return (
                <div
                  key={theme.id}
                  onClick={() => toggleTheme(theme.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950/40 dark:border-amber-500 dark:text-amber-200 shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-stone-700 dark:bg-stone-900/60 dark:border-stone-800 dark:hover:border-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                        {getThemeIcon(theme.icon)}
                      </div>
                      <span>{lang === 'hi' ? theme.nameHi : theme.nameEn}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                    {lang === 'hi' ? theme.descriptionHi : theme.descriptionEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer & Submit */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 mt-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-3 justify-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {lang === 'hi'
                ? `चयनित: ${selected.length} / 5 (न्यूनतम 3)`
                : `Selected: ${selected.length} / 5 (min 3)`}
            </div>

            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer"
                >
                  {lang === 'hi' ? 'बाद में' : 'Skip'}
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={selected.length < 3 || loading}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('onboarding_continue', lang)}</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
