import { Platform } from 'react-native';
import type { ComponentType, ReactElement } from 'react';
import type { LatLng } from '@collectigo/shared';
import type * as ReactNativeMaps from 'react-native-maps';
import type { MapMarkerProps, MapViewProps } from 'react-native-maps';
import { HUANCAYO_CENTER } from '../../constants/locations';
import { MapPlaceholder } from './MapPlaceholder';
import { colors } from '../../theme/tokens';

interface SelectionMapProps {
  origin: LatLng | null;
  destination: LatLng | null;
  onSelect?: (coordinate: LatLng) => void;
}

// react-native-maps no tiene soporte web: se carga solo en plataformas nativas.
type MapsModule = typeof ReactNativeMaps;
let maps: MapsModule | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  maps = require('react-native-maps') as MapsModule;
}

export function SelectionMap({ origin, destination, onSelect }: SelectionMapProps): ReactElement {
  if (!maps) {
    return <MapPlaceholder origin={origin} destination={destination} onSelect={onSelect} />;
  }

  // react-native-maps 1.27.2 fue publicado con tipos de React 19.1;
  // Expo SDK 57 usa React 19.2. El runtime es compatible, pero sus clases
  // necesitan normalizarse a ComponentType para el chequeo JSX de TypeScript 6.
  const MapView = maps.default as unknown as ComponentType<MapViewProps>;
  const Marker = maps.Marker as unknown as ComponentType<MapMarkerProps>;

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: HUANCAYO_CENTER.lat,
        longitude: HUANCAYO_CENTER.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      onPress={(event) =>
        onSelect?.({
          lat: event.nativeEvent.coordinate.latitude,
          lng: event.nativeEvent.coordinate.longitude,
        })
      }
      showsUserLocation
      showsMyLocationButton
      accessibilityLabel="Mapa para seleccionar origen y destino"
    >
      {origin ? (
        <Marker
          coordinate={{ latitude: origin.lat, longitude: origin.lng }}
          title="Origen"
          pinColor={colors.primary}
        />
      ) : null}
      {destination ? (
        <Marker
          coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          title="Destino"
          pinColor={colors.destination}
        />
      ) : null}
    </MapView>
  );
}
