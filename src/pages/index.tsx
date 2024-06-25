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
import toast from "react-hot-toast"

function secondsToSecondsAndMinutes(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function App() {
  const [nick, setNick] = useState('')
  const [checking, setChecking] = useState(false)
  const [moving, setMoving] = useState(false)
  const [name, setName, wallet, activeTab, setWallet, setAddress, location, address] = gameStore((state) => [state.name, state.setName, state.wallet, state.activeTab, state.setWallet, state.setAddress, state.location, state.address])
  const [moveTimer, setMoveTimer] = useState(0)
  const [validWallet, setValidWallet] = useState(false)

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
        setAddress(address)
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
    toast.success("Wallet generated!\nPlease enter a nickname")
  }

  async function register() {
    setChecking(true)
    const res = await runLua(nick, GAME_ID, [
      { name: 'Action', value: 'Bombar.Register' },
    ])
    setChecking(false)
    console.log(res)
    const { Messages } = res
    const data = Messages[0].Data as string
    if (data.includes('registered')) {
      setName(nick)
      toast.success("Player Registered successfully\nHappy Joosing!")
    } else {
      toast.error(data)
    }
  }

  async function movePlayer() {
    const lat = location[0]
    const lon = location[1]
    if (lat == 0 || lon == 0) return toast.error("Location not found")
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
          toast.success("+1 Joose Box for moving")
          setMoveTimer(300)
        }
        if (t.name == 'Action' && t.value == 'Bombar.Cooldown') {
          const { Data } = m
          console.log("cooldown", Data)
          toast.error("Movement cooldown: " + secondsToSecondsAndMinutes(parseInt(Data.toString())) + "\nFeel free to bomb someone else in the meantime")
          setMoveTimer(parseInt(Data))
        }
      })
    })
  }

  useEffect(() => {
    if (moveTimer <= 0) return
    const t = setTimeout(() => {
      setMoveTimer(parseInt((moveTimer - 1).toString()))
    }, 1000)
    return () => clearTimeout(t)
  }, [moveTimer])

  function processFile(e: any) {
    if (!e.target.files.length) return toast.error("No file selected")
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wallet = JSON.parse(e.target?.result as string)
        const arweave = Arweave.init({
          host: 'arweave.net',
          port: 443,
          protocol: 'https',
        })
        const address = await arweave.wallets.jwkToAddress(wallet)
        setValidWallet(true)
        setAddress(address)
        setWallet(wallet)
        window.arweaveWallet = wallet
        localStorage.setItem('bombar-wallet', JSON.stringify(wallet))
        toast.success("Wallet loaded successfully")
      } catch (err) {
        toast.error("Invalid wallet file")
        setValidWallet(false)
        // reset the input
        const inputItem = document.querySelector('#wallet-input') as HTMLInputElement
        inputItem.value = ''
      }
    }
    reader.readAsText(file)
  }


  return (
    <div className="text-center max-w-[100vw] max-h-screen">
      {name ? <>
        {activeTab === 'map' && <Map />}
        {activeTab === 'you' && <You />}
        {activeTab === 'opt' && <Opt />}
      </> : <div className="w-screen h-screen flex flex-col items-center justify-center gap-0">
        <Image src="/bombar/joose.svg" width={100} height={100} alt="joose" className="w-1/3 mx-auto" />
        <div className="mb-10">             <span className="font-bold text-xl text-green-600"> BombAR</span> <br /> Bomb your friends to get their JOOSE!<br />
          <span className="text-xs">This is a real life location based game</span>
          <span className="text-xs">{address}</span>
        </div>

        {wallet ? <>
          <input type="text" disabled={checking} className="bg-white p-1 ring-2 mb-2 rounded ring-green-400 text-green-800 focus:outline-none" placeholder="Enter your nickname" onChange={(e) => setNick(e.target.value)} />
          <button onClick={register} disabled={checking} className="disabled:opacity-30 ring-2 ring-green-400 text-green-800 font-bold rounded h-fit p-2 px-6 bg-green-200">{checking ? "Loading..." : "Register Nickname"}</button>
        </> : <>
          <button className="disabled:opacity-30 ring-2 ring-green-400 text-green-800 font-bold rounded h-fit p-2 px-6 bg-green-200" disabled={checking} onClick={createWallet}><span>{checking ? "loading..." : "generate wallet"}</span></button>
          <label htmlFor="file" className="mt-5">or upload one</label>
          <input type="file" id="wallet-input" disabled={checking} accept=".json" className="bg-white p-1 ring-2 rounded ring-green-400 text-green-800 focus:outline-none" onChange={(e) => processFile(e)} />
          {validWallet && <button className="disabled:opacity-30 ring-2 ring-green-400 text-green-800 font-bold rounded h-fit p-2 px-6 bg-green-200" onClick={createWallet}><span>Next</span></button>}
        </>}
      </div>}


      {name && <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end h-fit p-2.5 z-50">
        <BottomTabs />
        {activeTab == 'map' && <div className="py-2 flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-1">
            <div data-movable={moveTimer <= 0} className="text-red-400 h-fit data-[movable=true]:text-green-600 font-bold border border-black/30 bg-white/80 rounded-md px-1 shadow-black">{moveTimer <= 0 ? "MOVE!" : secondsToSecondsAndMinutes(moveTimer)}</div>
            <button onClick={movePlayer} data-movable={moveTimer <= 0} className="bg-white/70 data-[movable=true]:bg-green-400/70 rounded-full border border-black/30 text-xs w-fit">
              <Image src="/bombar/move-player.svg" width={52} height={52} alt="move player" data-moving={moving} className="data-[moving=true]:animate-spin p-1" />
            </button>
          </div>
        </div>}
      </div>}

    </div>
  )
}

export default App
