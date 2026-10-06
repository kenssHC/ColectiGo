import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import {
  suggestionsService,
  type SuggestionWithRoute,
} from '../../src/services/suggestions.service';
import type { SuggestionStatus } from '@collectigo/shared';

const STATUS_LABEL: Record<SuggestionStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#D97706', bg: 'bg-amber-50' },
  approved: { label: 'Aprobada', color: '#16A34A', bg: 'bg-green-50' },
  rejected: { label: 'Rechazada', color: '#DC2626', bg: 'bg-red-50' },
};

const TYPE_LABEL: Record<string, string> = {
  stop_position: 'Posición de parada',
  route_path: 'Recorrido',
  fare: 'Tarifa',
  schedule: 'Horario',
  other: 'Otro',
};

export default function SuggestionsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SuggestionWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (refreshing = false): Promise<void> => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await suggestionsService.mine();
      setItems(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar las sugerencias',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver al perfil"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#374151" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 flex-1">Mis sugerencias</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1 bg-blue-700 rounded-full px-3.5 py-2"
          onPress={() => router.push('/profile/new-suggestion')}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva sugerencia"
        >
          <Ionicons name="add" size={14} color="white" />
          <Text className="text-white text-xs font-semibold">Nueva</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
          }
        >
          {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

          {!errorMessage && items.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16 gap-2">
              <Ionicons name="git-branch-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 text-base font-medium">Sin sugerencias aún</Text>
              <Text className="text-gray-300 text-sm text-center px-8">
                Cuando envíes correcciones sobre rutas, aparecerán aquí
              </Text>
              <TouchableOpacity
                className="mt-3 bg-blue-700 rounded-xl px-5 py-3"
                onPress={() => router.push('/profile/new-suggestion')}
                accessibilityRole="button"
                accessibilityLabel="Crear mi primera sugerencia"
              >
                <Text className="text-white text-sm font-semibold">Crear mi primera sugerencia</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {items.map((item) => {
            const status = STATUS_LABEL[item.status];
            return (
              <View
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 gap-2"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-sm font-semibold text-gray-900 flex-1" numberOfLines={1}>
                    {item.route?.name ?? 'Ruta'}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-full ${status.bg}`}>
                    <Text className="text-xs font-medium" style={{ color: status.color }}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-400">
                  {TYPE_LABEL[item.type] ?? item.type}
                </Text>
                <Text className="text-sm text-gray-700 leading-5">{item.description}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
