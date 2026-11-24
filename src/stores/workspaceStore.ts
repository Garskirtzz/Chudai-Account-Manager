import { create } from 'zustand'

interface WorkspaceState {
  focusedAccountId: string | null
  selectedAccountIds: string[]
  setFocusedAccount: (id: string | null) => void
  toggleSelectedAccount: (id: string) => void
  setSelectedAccounts: (ids: string[]) => void
  clearSelection: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  focusedAccountId: null,
  selectedAccountIds: [],
  setFocusedAccount: (focusedAccountId) => set({ focusedAccountId }),
  toggleSelectedAccount: (id) =>
    set((state) => ({
      selectedAccountIds: state.selectedAccountIds.includes(id)
        ? state.selectedAccountIds.filter((item) => item !== id)
        : [...state.selectedAccountIds, id],
    })),
  setSelectedAccounts: (selectedAccountIds) => set({ selectedAccountIds }),
  clearSelection: () => set({ selectedAccountIds: [] }),
}))
