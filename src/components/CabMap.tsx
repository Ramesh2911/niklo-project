import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { Target, Plus, Minus } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_SCRIPT_ID } from '../lib/googleMaps';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // New Delhi fallback

export type LatLng = { lat: number; lng: number };

/** Debounces free-text -> lat/lng via the Google Geocoding API. */
function useGeocodedAddress(address: string, isLoaded: boolean): LatLng | null {
  const [coords, setCoords] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const trimmed = address.trim();
    if (trimmed.length < 3) return;

    const geocoder = new google.maps.Geocoder();
    const timer = window.setTimeout(() => {
      geocoder.geocode({ address: trimmed }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          setCoords({ lat: loc.lat(), lng: loc.lng() });
        }
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [address, isLoaded]);

  return coords;
}

/** Google's Directions API; falls back to a straight line if it's unreachable. */
function useRoute(pickup: LatLng | null, drop: LatLng | null, isLoaded: boolean): LatLng[] {
  const [route, setRoute] = useState<LatLng[]>([]);

  useEffect(() => {
    if (!isLoaded || !pickup || !drop) {
      setRoute([]);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pickup,
        destination: drop,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes[0]) {
          const path = result.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          setRoute(path);
        } else {
          console.warn('Directions unavailable, falling back to a straight line', status);
          setRoute([pickup, drop]);
        }
      },
    );
  }, [pickup, drop, isLoaded]);

  return route;
}

function MapControls({
  map,
  onLocateError,
  onCurrentLocation,
}: {
  map: google.maps.Map | null;
  onLocateError: (msg: string) => void;
  onCurrentLocation: (loc: LatLng) => void;
}) {
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    onLocateError('');
    if (!navigator.geolocation) {
      onLocateError('Location access is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        onCurrentLocation(here);
        map?.setCenter(here);
        map?.setZoom(15);
      },
      () => {
        setLocating(false);
        onLocateError('Could not access your location. Please enter it manually.');
      },
    );
  };

  return (
    <div className="map-controls">
      <button
        type="button"
        className="map-btn target-btn"
        onClick={handleLocate}
        disabled={locating}
        aria-label="Use my current location"
      >
        <Target size={26} />
      </button>
      <div className="zoom-controls">
        <button type="button" onClick={() => map && map.setZoom((map.getZoom() ?? 12) + 1)} aria-label="Zoom in"><Plus size={24} /></button>
        <button type="button" onClick={() => map && map.setZoom((map.getZoom() ?? 12) - 1)} aria-label="Zoom out"><Minus size={24} /></button>
      </div>
    </div>
  );
}

interface CabMapProps {
  pickupAddress: string;
  dropAddress: string;
  onPickupCoords?: (coords: LatLng) => void;
  onDropCoords?: (coords: LatLng) => void;
}

const CabMap: React.FC<CabMapProps> = ({ pickupAddress, dropAddress, onPickupCoords, onDropCoords }) => {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [locateError, setLocateError] = useState('');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const pickupCoords = useGeocodedAddress(pickupAddress, isLoaded);
  const dropCoords = useGeocodedAddress(dropAddress, isLoaded);
  const route = useRoute(pickupCoords, dropCoords, isLoaded);
  const routePositions = useMemo(() => route, [route]);

  useEffect(() => { if (pickupCoords) onPickupCoords?.(pickupCoords); }, [pickupCoords, onPickupCoords]);
  useEffect(() => { if (dropCoords) onDropCoords?.(dropCoords); }, [dropCoords, onDropCoords]);

  useEffect(() => {
    if (!map) return;
    if (pickupCoords && dropCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupCoords);
      bounds.extend(dropCoords);
      map.fitBounds(bounds, 80);
    } else if (pickupCoords) {
      map.setCenter(pickupCoords);
      map.setZoom(13);
    } else if (dropCoords) {
      map.setCenter(dropCoords);
      map.setZoom(13);
    }
  }, [map, pickupCoords, dropCoords]);

  if (!isLoaded) {
    return <div className="gmap-fill" />;
  }

  return (
    <>
      <GoogleMap
        mapContainerClassName="gmap-fill"
        center={DEFAULT_CENTER}
        zoom={12}
        onLoad={setMap}
        options={{ disableDefaultUI: true, zoomControl: false }}
      >
        {pickupCoords && <Marker position={pickupCoords} />}
        {dropCoords && <Marker position={dropCoords} />}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#0052ff', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }}
          />
        )}
        {routePositions.length > 1 && <Polyline path={routePositions} options={{ strokeColor: '#0052ff', strokeWeight: 5 }} />}
      </GoogleMap>
      <MapControls map={map} onLocateError={setLocateError} onCurrentLocation={setCurrentLocation} />
      {locateError && <p className="map-locate-error">{locateError}</p>}
    </>
  );
};

export default CabMap;
