import Image from "next/image"
import gameStore from "@/hooks/store"
import { useEffect, useState } from "react"
import { dryrun } from "@permaweb/aoconnect"
import { GAME_ID } from "@/utils/ao-vars"

const Denominator = 100

export default function You() {
  const [address, name] = gameStore((state) => [state.address, state.name])
  const [balance, setBalance] = useState(0)


  useEffect(() => {
    setBalance(parseInt(localStorage.getItem('bombar-balance') || "0") / Denominator)
    dryrun({
      process: GAME_ID,
      tags: [
        { name: "Action", value: "Balance" }
      ],
      Owner: address
    }).then((res) => {
      const d = parseInt(res.Messages[0].Data)
      setBalance(d / Denominator)
      localStorage.setItem('bombar-balance', d.toString())
    })
  }, [])

  return <div className="flex flex-col items-center justify-center h-screen gap-5">
    <button className="fixed top-0 right-0 p-1 text-xl" onClick={() => window.location.reload()}>🔄</button>
    <Image src="/bombar/player.png" width={100} height={150} alt="player" className="" />

    <div className="text-xl font-bold">{name}</div>
    <div className="text-xs">{address}</div>
    <br />
    <div>Your Pocket has</div>
    <div>
      <div className="flex items-center"><Image src="/bombar/joose.svg" height={26} width={26} alt="joose" className="mx-1" /><div className="px-1 font-bold">{balance}</div></div>

    </div>

  </div>
}
