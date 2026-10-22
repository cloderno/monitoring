import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinOff } from 'lucide-react';
import { formatCoords } from '../services/geolocationService';

interface Props {
  latitude: number;
  longitude: number;
  isTest?: boolean;
  label?: string;
  zoom?: number;
}

const pinIcon = (isTest: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin${isTest ? ' map-pin--test' : ''}"><div class="map-pin__dot"></div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 26],
    popupAnchor: [0, -26],
  });

/** Интерактивная карта Leaflet + OpenStreetMap с маркером места проверки */
export function LocationMap({ latitude, longitude, isTest = false, label, zoom = 14 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let loaded = false;
    let errors = 0;
    try {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([latitude, longitude], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      })
        .on('tileload', () => {
          loaded = true;
        })
        .on('tileerror', () => {
          errors += 1;
          if (!loaded && errors >= 4) setFailed(true);
        })
        .addTo(map);
      markerRef.current = L.marker([latitude, longitude], { icon: pinIcon(isTest) }).addTo(map);
      mapRef.current = map;
      // Карта внутри анимируемой карточки: пересчитать размер после появления
      const t = window.setTimeout(() => map.invalidateSize(), 350);
      return () => {
        window.clearTimeout(t);
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      };
    } catch (err) {
      if (import.meta.env.DEV) console.error('[map]', err);
      setFailed(true);
    }
    // Карта создаётся один раз; смена точки обрабатывается ниже
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([latitude, longitude]);
    marker.setIcon(pinIcon(isTest));
    if (label) marker.bindTooltip(label, { direction: 'top', offset: [0, -24] });
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude, isTest, label]);

  return (
    <div className="map">
      <div ref={containerRef} className="map__canvas" aria-label="Карта места проверки" />
      {failed && (
        <div className="map__fallback">
          <MapPinOff size={22} />
          <b>Карта не загрузилась</b>
          <span>Проверьте подключение к интернету. Координаты: {formatCoords(latitude, longitude)}</span>
        </div>
      )}
    </div>
  );
}
