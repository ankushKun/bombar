import { create } from 'zustand'

type TGameTabs = 'map' | 'you' | 'opt' | 'fren'

interface GameState {
  wallet: any
  address: string
  activeTab: TGameTabs
  name: string
  location: [number, number]
  bombLoc: L.LatLngExpression | null
  setWallet: (wallet: any) => void
  setAddress: (address: string) => void
  setActiveTab: (tab: TGameTabs) => void
  setName: (name: string) => void
  setLocation: (location: [number, number]) => void
  setBombLoc: (location: L.LatLngExpression) => void
}

const gameStore = create<GameState>((set) => ({
  address: '',
  wallet: null,
  activeTab: 'map',
  name: '',
  location: [0, 0],
  bombLoc: null,
  setAddress: (address) => set({ address }),
  setWallet: (wallet) => set({ wallet }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setName: (name) => set({ name }),
  setLocation: (location: [number, number]) => set({ location }),
  setBombLoc: (bombLoc) => set({ bombLoc }),
}))

export default gameStore
