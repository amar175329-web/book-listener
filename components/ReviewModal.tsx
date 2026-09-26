'use client';

import React, { useState } from 'react';
import { Book, Language } from '@/lib/types';
import { X, Star, Save, BookCheck } from 'lucide-react';

interface Props {
  book: Book;
  initialRating?: number;
  initialNotes?: string;
  initialStatus?: string;
  lang?: Language;
  onClose: () => void;
  onSave: (rating: number, notes: string, status: string) => Promise<void>;
}

export function ReviewModal({
  book,
  initialRating = 5,
  initialNotes = '',
  initialStatus = 'reading',
  lang = 'en',
  onClose,
  onSave
}: Props) {
  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [status, setStatus] = useState<string>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(rating, notes, status);
      onClose();
    } catch (err) {
      console.error('Failed to save review:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#161B22] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
              {lang === 'hi' ? 'समीक्षा और व्यक्तिगत नोट्स' : 'Book Notes & Rating'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
              {book.title}
            </div>
            <div className="text-xs text-stone-500">{book.author}</div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {lang === 'hi' ? 'आपकी रेटिंग' : 'Your Rating'}
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-stone-300 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-stone-300 dark:text-stone-700'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-mono font-medium text-stone-600 dark:text-stone-400">
                {rating} / 5
              </span>
            </div>
          </div>

          {/* Reading Status */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {lang === 'hi' ? 'वर्तमान स्थिति' : 'Reading Status'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="reading">{lang === 'hi' ? 'पढ़ रहे हैं' : 'Currently Reading'}</option>
              <option value="listening">{lang === 'hi' ? 'सुन रहे हैं' : 'Currently Listening'}</option>
              <option value="completed">{lang === 'hi' ? 'पूर्ण हुई' : 'Completed'}</option>
              <option value="saved">{lang === 'hi' ? 'बाद के लिए सहेजा' : 'Saved for Later'}</option>
            </select>
          </div>

          {/* Reflection Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {lang === 'hi' ? 'व्यक्तिगत सीख और कार्य योजना' : 'Personal Takeaways & Action Plan'}
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'इस पुस्तक से आपने कौन सा एक मुख्य विचार या आदत सीखी जिसे आप अपने जीवन में लागू करेंगे?'
                  : 'What single takeaway or habit will you apply to solve your life challenge?'
              }
              className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed placeholder:text-stone-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? (lang === 'hi' ? 'सहेजा जा रहा है...' : 'Saving...') : (lang === 'hi' ? 'सहेजें' : 'Save Notes')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
