import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactElement, RefAttributes } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LatLng, PlannerResult } from '@collectigo/shared';
import type * as ReactNativeMaps from 'react-native-maps';
import type { MapMarkerProps, MapPolylineProps, MapViewProps } from 'react-native-maps';

interface ResultMapProps {
  result: PlannerResult;
  /** Color de respaldo para recorridos sin un color de ruta configurado. */
  rideColor: string;
}

type MapsModule = typeof ReactNativeMaps;
type MapViewInstance = InstanceType<MapsModule['default']>;

let maps: MapsModule | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  maps = require('react-native-maps') as MapsModule;
}

interface MapPath {
  path: LatLng[];
  color: string;
  dashed: boolean;
}

interface TripMarker {
  coordinate: LatLng;
  title: string;
  color: string;
}

interface TripGeometry {
  origin: LatLng | null;
  destination: LatLng | null;
  paths: MapPath[];
  markers: TripMarker[];
}

const straight = (from: LatLng | undefined, to: LatLng | undefined): LatLng[] =>
  from && to ? [from, to] : [];

function extractGeometry(result: PlannerResult, fallbackRideColor: string): TripGeometry {
  const locatedSteps = result.steps.filter((step) => step.from || step.to);
  const origin = locatedSteps.find((step) => step.from)?.from ?? null;
  const destination = [...locatedSteps].reverse().find((step) => step.to)?.to ?? null;
  const paths: MapPath[] = [];
  const markers: TripMarker[] = [];

  for (const step of result.steps) {
    const path = step.path ?? straight(step.from, step.to);
    if (path.length >= 2 && ['walk', 'transfer', 'arrive'].includes(step.type)) {
      paths.push({
        path,
        color: step.type === 'transfer' ? '#9333EA' : '#9CA3AF',
        dashed: true,
      });
    }

    if (step.type === 'ride') {
      const color = step.routeColor ?? fallbackRideColor;
      if (path.length >= 2) paths.push({ path, color, dashed: false });
      if (step.from) {
        markers.push({
          coordinate: step.from,
          title: `Sube a ${step.routeName ?? 'la ruta'}`,
          color,
        });
      }
      if (step.to) {
        markers.push({
          coordinate: step.to,
          title: `Baja de ${step.routeName ?? 'la ruta'}`,
          color,
        });
      }
    }
  }

  return { origin, destination, paths, markers };
}

function computeRegion(points: LatLng[]): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
  };
}

const toCoord = (point: LatLng): { latitude: number; longitude: number } => ({
  latitude: point.lat,
  longitude: point.lng,
});

export function ResultMap({ result, rideColor }: ResultMapProps): ReactElement | null {
  const mapRef = useRef<MapViewInstance | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const geometry = useMemo(() => extractGeometry(result, rideColor), [result, rideColor]);

  const allPoints = useMemo(
    () =>
      [
        geometry.origin,
        geometry.destination,
        ...geometry.paths.flatMap((segment) => segment.path),
        ...geometry.markers.map((marker) => marker.coordinate),
      ].filter((point): point is LatLng => point !== null),
    [geometry],
  );

  const fitToTrip = useCallback(
    (animated: boolean) => {
      if (!mapRef.current || allPoints.length < 2) return;
      mapRef.current.fitToCoordinates(allPoints.map(toCoord), {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated,
      });
    },
    [allPoints],
  );

  useEffect(() => {
    if (isMapReady) fitToTrip(false);
  }, [isMapReady, fitToTrip]);

  if (!maps || result.steps.length === 0) {
    if (Platform.OS === 'web' && result.steps.length > 0) {
      return (
        <View className="h-24 mx-4 mt-3 rounded-2xl bg-slate-100 items-center justify-center">
          <Text className="text-xs text-gray-400">
            El mapa del recorrido está disponible en Android o iOS
          </Text>
        </View>
      );
    }
    return null;
  }

  if (allPoints.length < 2) return null;

  const MapView = maps.default as unknown as ComponentType<
    MapViewProps & RefAttributes<MapViewInstance>
  >;
  const Marker = maps.Marker as unknown as ComponentType<MapMarkerProps>;
  const Polyline = maps.Polyline as unknown as ComponentType<MapPolylineProps>;

  return (
    <View className="mx-4 mt-3 rounded-2xl overflow-hidden border border-gray-100">
      <MapView
        ref={mapRef}
        style={{ height: 280 }}
        initialRegion={computeRegion(allPoints)}
        onMapReady={() => setIsMapReady(true)}
        scrollEnabled
        zoomEnabled
        zoomControlEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {geometry.paths.map((segment, index) => (
          <Polyline
            key={`path-${index}`}
            coordinates={segment.path.map(toCoord)}
            strokeColor={segment.color}
            strokeWidth={segment.dashed ? 3 : 4}
            {...(segment.dashed ? { lineDashPattern: [6, 6] } : {})}
          />
        ))}

        {geometry.origin ? (
          <Marker coordinate={toCoord(geometry.origin)} title="Origen" pinColor="#1D4ED8" />
        ) : null}
        {geometry.markers.map((marker, index) => (
          <Marker
            key={`marker-${index}`}
            coordinate={toCoord(marker.coordinate)}
            title={marker.title}
            pinColor={marker.color}
          />
        ))}
        {geometry.destination ? (
          <Marker coordinate={toCoord(geometry.destination)} title="Destino" pinColor="#DC2626" />
        ) : null}
      </MapView>

      <TouchableOpacity
        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white items-center justify-center shadow-md"
        style={{ elevation: 4 }}
        onPress={() => fitToTrip(true)}
        accessibilityRole="button"
        accessibilityLabel="Centrar el recorrido en el mapa"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="scan-outline" size={20} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}
