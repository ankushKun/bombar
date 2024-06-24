import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { dryrun } from "@permaweb/aoconnect";
import { GAME_ID, runLua } from "@/utils/ao-vars";
import gameStore from "@/hooks/store";


interface CustomMarkerProps {
  position: L.LatLngExpression;
  children: React.ReactNode; // Content to display inside the marker
}

const LiveLocationMarker: React.FC<CustomMarkerProps> = ({ position, children }) => {
  const map = useMap();

  const customIcon = L.icon({
    iconUrl: '/live-location.svg',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });

  const currentPosition = map.getCenter()
  if (currentPosition.lat == 0 && currentPosition.lng == 0) map.setView(position, 16)

  return (
    <Marker position={position} icon={customIcon}>
      {children}
    </Marker>
  );
};

type TPlayer = {
  address: string,
  lat: number,
  lon: number,
  name: string,
  last_update: number
}

type TPlayers = {
  active: TPlayer[],
  inactive: TPlayer[],
  closest: TPlayer[],
  me: {
    lat: number,
    lon: number
  }

}

const activeIcon = L.icon({
  iconUrl: '/active-marker.svg',
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

const inactiveIcon = L.icon({
  iconUrl: '/inactive-marker.svg',
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

export default function Map() {
  const [geoLocation, setGeoLocation] = useState<[number, number]>([0, 0])
  const [address] = gameStore((state) => [state.address])
  const [players, setPlayers] = useState<TPlayers>()

  useEffect(() => {
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position)
        setGeoLocation([position.coords.latitude, position.coords.longitude])
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await dryrun({
        process: GAME_ID,
        tags: [
          { name: 'Action', value: 'Bombar.AllPlayers' },
          { name: "Lat", value: geoLocation[0].toString() },
          { name: "Lon", value: geoLocation[1].toString() }
        ],
        Owner: address
      })
      console.log(res)
      const { Messages } = res
      const allPlayersData = JSON.parse(Messages[0].Data)
      console.log(allPlayersData)
      setPlayers(allPlayersData)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  async function movePlayer() {
    const lat = geoLocation[0]
    const lon = geoLocation[1]
    console.log(lat, lon)
    const mid = await runLua('', GAME_ID, [
      { name: 'Action', value: 'Bombar.MovePlayer' },
      { name: 'Lat', value: `${lat}` },
      { name: 'Lon', value: `${lon}` }
    ])
    console.log(mid)
    const { Messages } = mid
    Messages.forEach((m: any) => {
      const { Tags } = m
      Tags.forEach((t: any) => {
        if (t.name == 'Action' && t.value == 'Bombar.MovePlayerResponse') {
          const { Data } = m
          console.log(Data)
        }
        if (t.name == 'Action' && t.value == 'Bombar.Cooldown') {
          const { Data } = m
          console.log("cooldown", Data)

        }
      })
    })
  }

  return <>
    <div className="absolute z-50 bottom-0 bg-white right-0">
      <button onClick={movePlayer}>Move Player</button>
    </div>
    <MapContainer center={geoLocation} zoom={13} scrollWheelZoom={false} className='leaflet-container'>
      <TileLayer
        // attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* <Marker position={[51.505, -0.09]}> */}
      {/*     <Popup> */}
      {/*         This is a popup */}
      {/*     </Popup> */}
      {/* </Marker> */}
      {
        players?.active.map((player, index) => {
          return <Marker icon={activeIcon} key={index} position={[player.lat, player.lon]}>
            <Popup>
              {player.name}
            </Popup>
          </Marker>
        })
      }
      {
        players?.inactive.map((player, index) => {
          return <Marker icon={inactiveIcon} key={index} position={[player.lat, player.lon]}>
            <Popup>
              {player.name}
            </Popup>
          </Marker>
        })
      }

      <LiveLocationMarker position={geoLocation}>
        <Popup>
          This is your live location
        </Popup>
      </LiveLocationMarker>
    </MapContainer></>
}
