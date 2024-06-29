import { Circle, MapContainer, MapContainerProps, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, SetStateAction, Dispatch } from "react";
import { dryrun } from "@permaweb/aoconnect";
import { GAME_ID, runLua } from "@/utils/ao-vars";
import gameStore from "@/hooks/store";
import Image from "next/image";


interface CustomMarkerProps {
  position: L.LatLngExpression;
  children: React.ReactNode; // Content to display inside the marker
}

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

const iconW = 2.5
const iconH = 3.7

const PlayerMarker: React.FC<CustomMarkerProps> = ({ position, children }) => {
  const map = useMap();

  //icon size is 300x206px
  //icon anchor is 150x206px
  //icon size should be 2x the zoom level
  //icon anchor should be 1x the zoom level

  const customIcon = L.icon({
    iconUrl: '/bombar/player.png',
    iconSize: [iconW * map.getZoom(), iconH * map.getZoom()],
    iconAnchor: [iconW * map.getZoom() / 2, iconH * map.getZoom() / 2],

  });

  const currentPosition = map.getCenter()
  if (currentPosition.lat == 0 && currentPosition.lng == 0) map.flyTo(position, 17)

  return (
    <Marker position={position} icon={customIcon}>
      {children}
    </Marker>
  );
};

const ActivePlayerMarker: React.FC<CustomMarkerProps> = ({ position, children }) => {
  const map = useMap();

  const customIcon = L.icon({
    iconUrl: '/bombar/player-active.png',
    iconSize: [iconW * map.getZoom(), iconH * map.getZoom()],
    iconAnchor: [iconW * map.getZoom() / 2, iconH],
  });

  return (
    <Marker position={position} icon={customIcon} title="hihi">
      {children}
    </Marker>
  );
}

function LocationMarker({bombLoc, setBombLoc,bombRadius=100}: {bombLoc: L.LatLngExpression, setBombLoc: (e:L.LatLngExpression)=>void, bombRadius?: number}) {

  const map = useMapEvents({
    click(e) {
      map.flyTo(e.latlng, map.getZoom());
      setBombLoc(e.latlng)
    },
  });

  return bombLoc == null ? null : (
    <><Circle center={bombLoc} radius={100} pathOptions={{ color: "red", fillOpacity: 0.3 }}>
    </Circle>
    <Circle center={bombLoc} radius={5} pathOptions={{ color: "red", fillOpacity:1 }} >
        <Popup>Bomb coords: {bombLoc&&bombLoc!.toString()}<br />Blast Radius: {bombRadius}m</Popup>
      </Circle>
    </>
  );
}

const InactivePlayerMarker: React.FC<CustomMarkerProps> = ({ position, children }) => {
  const map = useMap();

  const customIcon = L.icon({
    iconUrl: '/bombar/player-inactive.png',
    iconSize: [iconW * map.getZoom(), iconH * map.getZoom()],
    iconAnchor: [iconW * map.getZoom() / 2, iconH],
  });

  return (
    <Marker position={position} icon={customIcon}>
      {children}
    </Marker>
  );
}


export default function Map() {
  // const [geoLocation, setGeoLocation] = useState<[number, number]>([0, 0])
  const [location, setLocation] = gameStore((state) => [state.location, state.setLocation])
  const [address] = gameStore((state) => [state.address])
  const [bombLoc, setBombLoc] = gameStore((state) => [state.bombLoc, state.setBombLoc])
  const [players, setPlayers] = useState<TPlayers>()

  useEffect(() => {
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position)
        // setGeoLocation([position.coords.latitude, position.coords.longitude])
        setLocation([position.coords.latitude, position.coords.longitude])
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
          { name: "Lat", value: location[0].toString() },
          { name: "Lon", value: location[1].toString() }
        ],
        Owner: address
      })
      console.log(res)
      const { Messages } = res
      const allPlayersData = JSON.parse(Messages[0].Data)
      console.log(allPlayersData)
      setPlayers(allPlayersData)
    }, 11000)
    return () => clearInterval(interval)
  }, [])


  return <>
    <MapContainer center={location} zoom={16} scrollWheelZoom={false} className='w-screen h-screen z-0'>
      <TileLayer
        attribution='bombar.arweave.dev'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        // url='https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}.png'
      />
      {
        players?.active.map((player, index) => {
          if (player.address == address) return
          return <ActivePlayerMarker key={index} position={[player.lat, player.lon]}>
            <Popup className="z-30">
              {player.name}
            </Popup>
          </ActivePlayerMarker>
        })
      }
      {
        players?.inactive.map((player, index) => {
          if (player.address == address) return
          return <InactivePlayerMarker key={index} position={[player.lat, player.lon]}>
            <Popup className="z-40">
              {player.name}
            </Popup>
          </InactivePlayerMarker>
        })
      }

      <PlayerMarker position={location}>
        <Popup className="z-20">
          This is your live location
        </Popup>
      </PlayerMarker>

      <LocationMarker bombLoc={bombLoc!} setBombLoc={setBombLoc} bombRadius={100} />
    </MapContainer>
  </>
}
