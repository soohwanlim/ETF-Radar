import { create } from 'zustand';

export const useWatchlistStore = create((set, get) => ({
  watchlist: JSON.parse(localStorage.getItem('etf-watchlist') || '[]'),
  toggleWatchlist: (code) => set((state) => {
    const updated = state.watchlist.includes(code)
      ? state.watchlist.filter((c) => c !== code)
      : [...state.watchlist, code];
    localStorage.setItem('etf-watchlist', JSON.stringify(updated));
    return { watchlist: updated };
  }),
  isWatched: (code) => get().watchlist.includes(code),
}));
