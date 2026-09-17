// Single shared config so every map component loads the same Google Maps
// script instance instead of racing to inject it multiple times.
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const GOOGLE_MAPS_SCRIPT_ID = 'niklo-google-maps-script';
export const GOOGLE_MAPS_LIBRARIES: 'places'[] = ['places'];
