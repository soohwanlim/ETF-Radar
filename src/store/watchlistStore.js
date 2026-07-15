import { create } from 'zustand';

export const useWatchlistStore = create((set, get) => ({
  watchlist: JSON.parse(localStorage.getItem('etf-watchlist') || '[]'),
  holdingWatchlist: JSON.parse(localStorage.getItem('holding-watchlist') || '[]'),
  toggleWatchlist: (code) => set((state) => {
    const updated = state.watchlist.includes(code)
      ? state.watchlist.filter((c) => c !== code)
      : [...state.watchlist, code];
    localStorage.setItem('etf-watchlist', JSON.stringify(updated));
    return { watchlist: updated };
  }),
  isWatched: (code) => get().watchlist.includes(code),
  toggleHoldingWatchlist: (code) => set((state) => {
    const updated = state.holdingWatchlist.includes(code)
      ? state.holdingWatchlist.filter((c) => c !== code)
      : [...state.holdingWatchlist, code];
    localStorage.setItem('holding-watchlist', JSON.stringify(updated));
    return { holdingWatchlist: updated };
  }),
  isHoldingWatched: (code) => get().holdingWatchlist.includes(code),
}));
