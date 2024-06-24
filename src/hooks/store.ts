import { create } from 'zustand'

type TGameTabs = 'map' | 'you' | 'opt' | 'fren'

interface GameState {
  wallet: any
  address: string
  activeTab: TGameTabs
  name: string
  setWallet: (wallet: any) => void
  setAddress: (address: string) => void
  setActiveTab: (tab: TGameTabs) => void
  setName: (name: string) => void
}

const gameStore = create<GameState>((set) => ({
  address: '',
  wallet: null,
  activeTab: 'map',
  name: '',
  setAddress: (address) => set({ address }),
  setWallet: (wallet) => set({ wallet }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setName: (name) => set({ name })
}))

export default gameStore
