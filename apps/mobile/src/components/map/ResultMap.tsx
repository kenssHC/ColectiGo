import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, RefAttributes } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LatLng, PlannerResult } from '@collectigo/shared';
import type * as ReactNativeMaps from 'react-native-maps';
import type { MapMarkerProps, MapPolylineProps, MapViewProps } from 'react-native-maps';

interface ResultMapProps {
  result: PlannerResult;
  /** Color de la línea del tramo en vehículo (según el modo activo). */
  rideColor: string;
}

// react-native-maps no tiene soporte web: se carga solo en plataformas nativas.
type MapsModule = typeof ReactNativeMaps;
type MapViewInstance = InstanceType<MapsModule['default']>;

let maps: MapsModule | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  maps = require('react-native-maps') as MapsModule;
}

interface TripGeometry {
  origin: LatLng | null;
  destination: LatLng | null;
  boardStop: LatLng | null;
  alightStop: LatLng | null;
  ridePath: LatLng[];
  /** Caminata origen → paradero. Sigue las calles si el backend envió el trazado. */
  walkInPath: LatLng[];
  /** Caminata paradero de bajada → destino. */
  walkOutPath: LatLng[];
}

function extractGeometry(result: PlannerResult): TripGeometry {
  const walkStep = result.steps.find((s) => s.type === 'walk');
  const rideStep = result.steps.find((s) => s.type === 'ride');
  const arriveStep = result.steps.find((s) => s.type === 'arrive');

  const origin = walkStep?.from ?? null;
  const straight = (a: LatLng | null, b: LatLng | null): LatLng[] => (a && b ? [a, b] : []);

  // Viaje solo a pie: un único paso walk, sin paraderos.
  if (!rideStep) {
    const destination = arriveStep?.to ?? walkStep?.to ?? null;
    return {
      origin,
      destination,
      boardStop: null,
      alightStop: null,
      ridePath: [],
      walkInPath: walkStep?.path ?? straight(origin, destination),
      walkOutPath: [],
    };
  }

  const destination = arriveStep?.to ?? null;
  const boardStop = rideStep.from ?? walkStep?.to ?? null;
  const alightStop = rideStep.to ?? arriveStep?.from ?? null;

  return {
    origin,
    destination,
    boardStop,
    alightStop,
    ridePath: rideStep.path ?? [],
    walkInPath: walkStep?.path ?? straight(origin, boardStop),
    walkOutPath: arriveStep?.path ?? straight(alightStop, destination),
  };
}

function computeRegion(points: LatLng[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
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

const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

export function ResultMap({ result, rideColor }: ResultMapProps) {
  const mapRef = useRef<MapViewInstance | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const geometry = useMemo(() => extractGeometry(result), [result]);

  const allPoints = useMemo(() => {
    const { origin, destination, boardStop, alightStop, ridePath, walkInPath, walkOutPath } =
      geometry;
    return [
      origin,
      destination,
      boardStop,
      alightStop,
      ...ridePath,
      ...walkInPath,
      ...walkOutPath,
    ].filter((p): p is LatLng => p !== null);
  }, [geometry]);

  /**
   * En Android, initialRegion suele ignorarse cuando el mapa se monta dentro
   * de un ScrollView (las dimensiones aún no están definidas). fitToCoordinates
   * tras onMapReady garantiza el encuadre correcto, y también reencuadra al
   * cambiar de modo (shortest/fastest/cheapest).
   */
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
    if (isMapReady) {
      fitToTrip(false);
    }
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

  const { origin, destination, boardStop, alightStop, ridePath, walkInPath, walkOutPath } =
    geometry;

  if (allPoints.length < 2) {
    return null;
  }

  // Normaliza los tipos publicados contra React 19.1 al JSX de React 19.2
  // incluido por Expo SDK 57. No cambia los componentes usados en runtime.
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
        {walkInPath.length >= 2 ? (
          <Polyline
            coordinates={walkInPath.map(toCoord)}
            strokeColor="#9CA3AF"
            strokeWidth={3}
            lineDashPattern={[6, 6]}
          />
        ) : null}

        {ridePath.length >= 2 ? (
          <Polyline
            coordinates={ridePath.map(toCoord)}
            strokeColor={rideColor}
            strokeWidth={4}
          />
        ) : null}

        {walkOutPath.length >= 2 ? (
          <Polyline
            coordinates={walkOutPath.map(toCoord)}
            strokeColor="#9CA3AF"
            strokeWidth={3}
            lineDashPattern={[6, 6]}
          />
        ) : null}

        {origin ? <Marker coordinate={toCoord(origin)} title="Origen" pinColor="#1D4ED8" /> : null}
        {boardStop ? (
          <Marker coordinate={toCoord(boardStop)} title="Sube aquí" pinColor={rideColor} />
        ) : null}
        {alightStop ? (
          <Marker coordinate={toCoord(alightStop)} title="Baja aquí" pinColor={rideColor} />
        ) : null}
        {destination ? (
          <Marker coordinate={toCoord(destination)} title="Destino" pinColor="#DC2626" />
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
