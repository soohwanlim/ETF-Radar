import { create } from 'zustand';

export const useCompareStore = create((set) => ({
  selectedEtfs: [], // Array of ETF codes (strings)
  addEtf: (code) => set((state) => {
    if (state.selectedEtfs.includes(code)) return state;
    if (state.selectedEtfs.length >= 4) {
      alert('최대 4개까지만 비교 가능합니다.');
      return state;
    }
    return { selectedEtfs: [...state.selectedEtfs, code] };
  }),
  removeEtf: (code) => set((state) => ({
    selectedEtfs: state.selectedEtfs.filter((c) => c !== code),
  })),
  clearSelected: () => set({ selectedEtfs: [] }),
}));
