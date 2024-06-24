import You from "@/tabs/you"
import Opt from "@/tabs/opt"
const Map = dynamic(() => import('@/tabs/map'), {
  loading: () => <p>Loading...</p>,
  ssr: false
})

import BottomTabs from '@/components/bottom-tabs'
import gameStore from '@/hooks/store'
import { useEffect, useState } from "react"

import Arweave from 'arweave'
import dynamic from "next/dynamic"
import { dryrun } from "@permaweb/aoconnect"
import { GAME_ID, runLua } from "@/utils/ao-vars"

function App() {
  const [nick, setNick] = useState('')
  const [checking, setChecking] = useState(false)
  const [name, setName, wallet, activeTab, setWallet, setAddress] = gameStore((state) => [state.name, state.setName, state.wallet, state.activeTab, state.setWallet, state.setAddress])

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

  return (
    <main className="relative w-screen h-screen bg-black/15 text-center">
      {name ? <div className="z-10">
        {activeTab === 'map' && <Map />}
        {activeTab === 'you' && <You />}
        {activeTab === 'opt' && <Opt />}
      </div> : <div className="w-screen h-screen flex flex-col items-center justify-center">
        {wallet ? <>
          <input type="text" className="bg-white p-1" placeholder="Enter your nickname" onChange={(e) => setNick(e.target.value)} />
          <button onClick={register}>Register</button>
        </> : <button className="my-auto" disabled={checking} onClick={createWallet}>generate wallet</button>}
      </div>}


      <div className="fixed bottom-0 left-0 right-0 h-fit p-2.5 z-50">
        <BottomTabs />
      </div>

    </main>
  )
}

export default App
