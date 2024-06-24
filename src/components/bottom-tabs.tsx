import { RiTreasureMapLine } from "react-icons/ri";
import { LiaUserSecretSolid } from "react-icons/lia";
import { CgOptions } from "react-icons/cg";

import useStore from "../hooks/store";




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
        <TabItem icon={<RiTreasureMapLine size={20} />} label="MAP" onClick={()=>setActiveTab('map')}/>
        <TabItem icon={<LiaUserSecretSolid size={25} />} label="YOU" onClick={()=>setActiveTab('you')} />
        {/* <TabItem icon={<CgOptions size={20} />} label="OPT" onClick={()=>setActiveTab('opt')}/> */}
    </nav>
}
