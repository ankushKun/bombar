import mapIcon from "@/assets/map.svg";
import accountIcon from "@/assets/account.svg";


import useStore from "../hooks/store";
import Image from "next/image";




function TabItem({icon, label, onClick}: {icon: React.ReactNode, label: string; onClick?: () => void}){
    return <div className="flex flex-col items-center hover:bg-black/5 p-2 px-4 rounded-3xl" onClick={onClick}>
        <div>
            {icon}
        </div>
        <div className='text-xs'>
            {label}
        </div>
    </div>
}

export default function BottomTabs(){
    const setActiveTab = useStore((state) => state.setActiveTab)

    return <nav className="flex justify-evenly items-center w-fit p-1 px-1.5 rounded-full bg-white drop-shadow-lg border border-black/30">
        <TabItem icon={<Image src={mapIcon} width={25} height={25}  alt="map"/>} label="MAP" onClick={()=>setActiveTab('map')}/>
        <TabItem icon={<Image src={accountIcon} width={25} height={25} alt="account"/>} label="YOU" onClick={()=>setActiveTab('you')} />

    </nav>
}
