'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Book, AudioTrack, Language } from '@/lib/types';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Gauge,
  ListMusic,
  Sparkles
} from 'lucide-react';

interface Props {
  book: Book;
  tracks: AudioTrack[];
  currentTrackIndex: number;
  onTrackChange: (index: number) => void;
  lang?: Language;
  onClose?: () => void;
  onProgressUpdate?: (seconds: number, duration: number, chapterIndex: number) => void;
  initialTime?: number;
  ttsText?: string; // If playing summary via Web Speech TTS
}

export function AudioPlayer({
  book,
  tracks,
  currentTrackIndex,
  onTrackChange,
  lang = 'en',
  onClose,
  onProgressUpdate,
  initialTime = 0,
  ttsText
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  const currentTrack = tracks[currentTrackIndex];
  const isTtsMode = Boolean(ttsText);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 1. Initialize or switch audio track
  useEffect(() => {
    if (isTtsMode && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // TTS Mode via Web Speech API
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(ttsText);
      utterance.rate = playbackRate;
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';

      utterance.onstart = () => {
        setIsPlaying(true);
      };
      utterance.onend = () => {
        setIsPlaying(false);
        if (onProgressUpdate) onProgressUpdate(100, 100, 0);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
      };

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setDuration(300); // Estimated 5 min for summary
      return () => {
        window.speechSynthesis.cancel();
      };
    } else if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.streamUrl;
      audioRef.current.playbackRate = playbackRate;
      if (initialTime > 0) {
        audioRef.current.currentTime = initialTime;
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('[Audio Player Autoplay blocked or error]:', err);
        setIsPlaying(false);
      });
    }
  }, [currentTrack, ttsText, isTtsMode, lang]);

  // 2. Web Media Session API Registration (Section 5.6 of PRD)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const title = isTtsMode 
      ? `Summary: ${book.title}` 
      : (currentTrack ? currentTrack.title : book.title);
    const artist = book.author;
    const album = 'Book Listener';

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: [
        {
          src: book.coverUrl || 'https://covers.openlibrary.org/b/id/13202688-M.jpg',
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      togglePlay();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      togglePlay();
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      skipSeconds(-(details.seekOffset || 15));
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      skipSeconds(details.seekOffset || 15);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (currentTrackIndex > 0) {
        onTrackChange(currentTrackIndex - 1);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (currentTrackIndex < tracks.length - 1) {
        onTrackChange(currentTrackIndex + 1);
      }
    });
  }, [book, currentTrack, currentTrackIndex, tracks.length, isTtsMode]);

  // Synchronize MediaSession Position State
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0),
          playbackRate,
          position: Math.min(Math.max(currentTime, 0), duration)
        });
      } catch (e) {
        // Ignore edge-case timestamp jitter
      }
    }
  }, [currentTime, duration, playbackRate]);

  // Sleep Timer Countdown
  useEffect(() => {
    if (!sleepTimerMinutes) {
      setSleepTimerRemaining(null);
      return;
    }

    setSleepTimerRemaining(sleepTimerMinutes * 60);
    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (audioRef.current) audioRef.current.pause();
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerMinutes]);

  // Play / Pause Toggle
  const togglePlay = () => {
    if (isTtsMode && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true));
    }
  };

  // Skip ±15s
  const skipSeconds = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration || 10000);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Speed Adjustment
  const cyclePlaybackRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    if (isTtsMode && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Re-trigger with new rate if active
      if (speechUtteranceRef.current) {
        speechUtteranceRef.current.rate = nextRate;
      }
    }
  };

  // Format Time (MM:SS or HH:MM:SS)
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Hidden Native Audio Element */}
      {!isTtsMode && (
        <audio
          ref={audioRef}
          onTimeUpdate={() => {
            if (audioRef.current) {
              const cur = audioRef.current.currentTime;
              setCurrentTime(cur);
              if (onProgressUpdate && Math.floor(cur) % 5 === 0) {
                onProgressUpdate(cur, duration, currentTrackIndex);
              }
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            if (currentTrackIndex < tracks.length - 1) {
              onTrackChange(currentTrackIndex + 1);
            } else {
              setIsPlaying(false);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Expanded Fullscreen / Bottom Drawer Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-stone-900/95 text-stone-100 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                {isTtsMode ? 'Book Listener AI Summary' : 'LibriVox Free Audiobook'}
              </div>
              <div className="text-sm font-medium text-stone-300 truncate max-w-xs sm:max-w-md">
                {book.title}
              </div>
            </div>
            <button
              onClick={() => setShowQueue(!showQueue)}
              className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
              title="Chapters Queue"
            >
              <ListMusic className="w-6 h-6" />
            </button>
          </div>

          {/* Central Artwork & Track Details */}
          <div className="max-w-md mx-auto w-full flex flex-col items-center my-auto">
            <div className="w-56 h-72 sm:w-64 sm:h-80 rounded-2xl overflow-hidden shadow-2xl bg-stone-800 border border-stone-700 mb-6 flex items-center justify-center">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="p-4 text-center">
                  <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                  <div className="font-serif text-lg font-bold">{book.title}</div>
                </div>
              )}
            </div>

            <div className="text-center w-full px-4">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white truncate">
                {isTtsMode ? book.title : (currentTrack ? currentTrack.title : book.title)}
              </h2>
              <p className="text-sm text-stone-400 mt-1">{book.author}</p>
            </div>
          </div>

          {/* Player Controls & Scrubber in Expanded View */}
          <div className="max-w-lg mx-auto w-full">
            {/* Scrubber */}
            <div className="w-full mb-4">
              <div className="flex justify-between text-xs text-stone-400 mb-1.5 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Main Buttons */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
              <button
                onClick={() => currentTrackIndex > 0 && onTrackChange(currentTrackIndex - 1)}
                disabled={currentTrackIndex === 0}
                className="p-2 text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-6 h-6" />
              </button>

              <button
                onClick={() => skipSeconds(-15)}
                className="p-2 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer"
                title="Rewind 15 seconds"
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>

              <button
                onClick={() => skipSeconds(15)}
                className="p-2 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer"
                title="Forward 15 seconds"
              >
                <RotateCw className="w-6 h-6" />
              </button>

              <button
                onClick={() => currentTrackIndex < tracks.length - 1 && onTrackChange(currentTrackIndex + 1)}
                disabled={currentTrackIndex >= tracks.length - 1}
                className="p-2 text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Accessories: Speed & Sleep Timer */}
            <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
              <button
                onClick={cyclePlaybackRate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 cursor-pointer"
              >
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>{playbackRate}x</span>
              </button>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <select
                  value={sleepTimerMinutes || ''}
                  onChange={(e) => setSleepTimerMinutes(e.target.value ? parseInt(e.target.value) : null)}
                  className="bg-stone-800 text-stone-300 rounded px-2 py-1 text-xs outline-none border border-stone-700 cursor-pointer"
                >
                  <option value="">{lang === 'hi' ? 'स्लीप टाइमर बंद' : 'Sleep Timer: Off'}</option>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </select>
                {sleepTimerRemaining && (
                  <span className="font-mono text-amber-400">
                    {Math.floor(sleepTimerRemaining / 60)}:{(sleepTimerRemaining % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Docked Bottom Mini Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 shadow-xl transition-all">
        {/* Progress Line */}
        <div className="w-full bg-stone-200 dark:bg-stone-800 h-1">
          <div
            className="bg-amber-500 h-1 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Track Info & Artwork */}
          <div 
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 cursor-pointer min-w-0 max-w-[40%] group"
          >
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 flex-shrink-0 border border-stone-300 dark:border-stone-700 relative">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-500 m-auto" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-serif font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 transition-colors">
                {isTtsMode ? `[Summary] ${book.title}` : (currentTrack ? currentTrack.title : book.title)}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {book.author}
              </div>
            </div>
          </div>

          {/* Central Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => skipSeconds(-15)}
              className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer hidden sm:block"
              title="Rewind 15s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => skipSeconds(15)}
              className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer hidden sm:block"
              title="Forward 15s"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls: Speed & Expand */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-stone-500 hidden md:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={cyclePlaybackRate}
              className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
              title="Cycle Speed"
            >
              {playbackRate}x
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer"
              title="Expand Player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
