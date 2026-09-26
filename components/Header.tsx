import React from 'react';
import { Language, User } from '@/lib/types';
import { t } from '@/lib/i18n';
import { BookOpen, Compass, Library, LogIn, LogOut, Sparkles, Languages } from 'lucide-react';

interface Props {
  lang: Language;
  onToggleLang: () => void;
  activeTab: 'discover' | 'search' | 'library';
  onSelectTab: (tab: 'discover' | 'search' | 'library') => void;
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenOnboarding: () => void;
}

export function Header({
  lang,
  onToggleLang,
  activeTab,
  onSelectTab,
  user,
  onOpenAuth,
  onSignOut,
  onOpenOnboarding
}: Props) {
  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/90 dark:bg-[#0E1117]/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div 
          onClick={() => onSelectTab('discover')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif font-bold text-lg leading-tight tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>{t('app_name', lang)}</span>
              <span className="text-[10px] font-sans font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                Legal Free
              </span>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block truncate max-w-xs">
              {t('app_tagline', lang)}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('discover')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden xs:inline">{t('nav_discover', lang)}</span>
          </button>

          <button
            onClick={() => onSelectTab('search')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t('nav_search', lang)}</span>
          </button>

          <button
            onClick={() => onSelectTab('library')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'library'
                ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200'
                : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Library className="w-4 h-4" />
            <span className="hidden xs:inline">{t('nav_library', lang)}</span>
          </button>
        </nav>

        {/* Action Controls: Language Toggle & User Auth */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="Toggle English / Hindi (हिन्दी)"
          >
            <Languages className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* User Account / Onboarding */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenOnboarding}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                title="Change Interest Themes"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'hi' ? 'विषय' : 'Themes'}</span>
              </button>

              <div className="text-xs font-medium text-stone-700 dark:text-stone-300 hidden sm:block px-2">
                {user.name.split(' ')[0]}
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition-colors cursor-pointer"
                title={t('nav_signout', lang)}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('nav_signin', lang)}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
