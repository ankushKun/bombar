import Image from "next/image"
import gameStore from "@/hooks/store"

export default function You() {
  const [address, name] = gameStore((state) => [state.address, state.name])

  return <div className="flex flex-col items-center justify-center h-screen gap-5">
    <Image src="/player.png" width={100} height={150} alt="player" className="" />

    <div className="text-xl font-bold">{name}</div>
    <div className="text-xs">{address}</div>

  </div>
}
