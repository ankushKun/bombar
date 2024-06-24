import You from "@/tabs/you"
import Opt from "@/tabs/opt"
const Map = dynamic(() => import('@/tabs/map'), {
  loading: () => <p>Loading...</p>,
  ssr: false
})

import BottomTabs from '@/components/bottom-tabs'
import gameStore from '@/hooks/store'
import { useEffect, useState } from "react"
import Image from "next/image"

import Arweave from 'arweave'
import dynamic from "next/dynamic"
import { dryrun } from "@permaweb/aoconnect"
import { GAME_ID, runLua } from "@/utils/ao-vars"

function App() {
  const [nick, setNick] = useState('')
  const [checking, setChecking] = useState(false)
  const [moving, setMoving] = useState(false)
  const [name, setName, wallet, activeTab, setWallet, setAddress, location] = gameStore((state) => [state.name, state.setName, state.wallet, state.activeTab, state.setWallet, state.setAddress, state.location])

  useEffect(() => {
    const wallet = localStorage.getItem('bombar-wallet')
    if (!wallet) return
    else {
      window.arweaveWallet = JSON.parse(wallet)
      const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
      })
      arweave.wallets.jwkToAddress(JSON.parse(wallet)).then(async (address) => {
        setChecking(true)
        const res = await dryrun({
          process: GAME_ID,
          data: address,
          tags: [
            { name: 'Action', value: 'Bombar.GetName' },
          ],
          Owner: address
        })
        setChecking(false)
        const { Messages } = res
        const name = Messages[0].Data
        setWallet(JSON.parse(wallet))
        console.log(res)
        if (name) {
          setAddress(address)
          setName(name)
        }
      })
    }
  }, [])

  async function createWallet() {
    if (localStorage.getItem('bombar-wallet')) return
    const arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    })

    const key = await arweave.wallets.generate()
    const address = await arweave.wallets.jwkToAddress(key)

    setWallet(key)
    setAddress(address)
    localStorage.setItem('bombar-wallet', JSON.stringify(key))
    window.arweaveWallet = key as any
  }

  async function register() {
    const res = await runLua(nick, GAME_ID, [
      { name: 'Action', value: 'Bombar.Register' },
    ])
    console.log(res)
    const { Messages } = res
    const data = Messages[0].Data as string
    if (data.includes('registered')) {
      setName(nick)
    } else {
      alert('Error registering: ' + data)
    }
  }

  async function movePlayer() {
    const lat = location[0]
    const lon = location[1]
    console.log(lat, lon)
    setMoving(true)
    const mid = await runLua('', GAME_ID, [
      { name: 'Action', value: 'Bombar.MovePlayer' },
      { name: 'Lat', value: `${lat}` },
      { name: 'Lon', value: `${lon}` }
    ])
    setMoving(false)
    console.log(mid)
    const { Messages } = mid
    Messages.forEach((m: any) => {
      const { Tags } = m
      Tags.forEach((t: any) => {
        if (t.name == 'Action' && t.value == 'Bombar.MovePlayerResponse') {
          const { Data } = m
          console.log(Data)
          alert(Data + " [next move in 5min]")
        }
        if (t.name == 'Action' && t.value == 'Bombar.Cooldown') {
          const { Data } = m
          console.log("cooldown", Data)
          alert("Cooldown: " + Data)

        }
      })
    })
  }


  return (
    <div className="text-center max-w-[100vw] max-h-screen">
      {name ? <>
        {activeTab === 'map' && <Map />}
        {activeTab === 'you' && <You />}
        {activeTab === 'opt' && <Opt />}
      </> : <div className="w-screen h-screen flex flex-col items-center justify-center">
        {wallet ? <>
          <input type="text" className="bg-white p-1" placeholder="Enter your nickname" onChange={(e) => setNick(e.target.value)} />
          <button onClick={register}>Register</button>
        </> : <button className="my-auto" disabled={checking} onClick={createWallet}><span>generate wallet</span></button>}
      </div>}


      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center h-fit p-2.5 z-50">
        <BottomTabs />
        {activeTab == 'map' && <div className="p-1">
          <button onClick={movePlayer}>
            <Image src="/move-player.svg" width={50} height={50} alt="move player" data-moving={moving} className="data-[moving=true]:animate-spin" />
          </button>
        </div>}
      </div>

    </div>
  )
}

export default App
