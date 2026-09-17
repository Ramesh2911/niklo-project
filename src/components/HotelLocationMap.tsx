import { useEffect, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_SCRIPT_ID } from '../lib/googleMaps';
import { useI18n } from '../contexts/I18nContext';

interface GeocodeHit { lat: number; lng: number }

interface HotelLocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  /** Falls back to geocoding this text when no lat/lng is on record for the hotel. */
  address: string;
  name: string;
}

const HotelLocationMap: React.FC<HotelLocationMapProps> = ({ latitude, longitude, address, name }) => {
  const { t } = useI18n();
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [geocoded, setGeocoded] = useState<GeocodeHit | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';

  useEffect(() => {
    if (!isLoaded || hasCoords || !address) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        setGeocoded({ lat: loc.lat(), lng: loc.lng() });
      } else {
        setNotFound(true);
      }
    });
  }, [isLoaded, hasCoords, address]);

  const center: GeocodeHit | null = hasCoords
    ? { lat: latitude as number, lng: longitude as number }
    : geocoded;

  if (!isLoaded || !center) {
    return (
      <div className="hd-map-placeholder">
        {notFound ? t('hotelMap.notFound') : t('hotelMap.loading')}
      </div>
    );
  }

  return (
    <GoogleMap
      center={center}
      zoom={14}
      mapContainerStyle={{ height: '320px', width: '100%', borderRadius: '12px' }}
    >
      <Marker position={center} onClick={() => setInfoOpen(true)} />
      {infoOpen && (
        <InfoWindow position={center} onCloseClick={() => setInfoOpen(false)}>
          <div>
            {name}
            <br />
            {address}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default HotelLocationMap;
