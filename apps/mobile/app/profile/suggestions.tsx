import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { SuggestionStatus } from '@collectigo/shared';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ScreenState } from '../../src/components/ui/ScreenState';
import {
  suggestionsService,
  type SuggestionWithRoute,
} from '../../src/services/suggestions.service';
import { colors } from '../../src/theme/tokens';

const STATUS_LABEL: Record<SuggestionStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: colors.warning, bg: 'bg-amber-50' },
  approved: { label: 'Aprobada', color: colors.success, bg: 'bg-green-50' },
  rejected: { label: 'Rechazada', color: colors.error, bg: 'bg-red-50' },
};

const TYPE_LABEL: Record<string, string> = {
  stop_position: 'Posición de parada',
  route_path: 'Recorrido',
  fare: 'Tarifa',
  schedule: 'Horario',
  other: 'Otro',
};

function SuggestionCard({ item }: { item: SuggestionWithRoute }): ReactElement {
  const status = STATUS_LABEL[item.status];
  return (
    <View className="bg-white rounded-2xl border border-slate-200 px-4 py-4 gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm font-bold text-slate-900 flex-1" numberOfLines={1}>
          {item.route?.name ?? 'Ruta'}
        </Text>
        <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
          <Text className="text-xs font-bold" style={{ color: status.color }}>
            {status.label}
          </Text>
        </View>
      </View>
      <Text className="text-xs font-semibold text-slate-600">
        {TYPE_LABEL[item.type] ?? item.type}
      </Text>
      <Text className="text-sm text-slate-700 leading-5">{item.description}</Text>
    </View>
  );
}

export default function SuggestionsScreen(): ReactElement {
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
      setItems(await suggestionsService.mine());
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

  const newSuggestionAction = (
    <Pressable
      className="min-h-11 px-3 rounded-full bg-blue-700 flex-row items-center justify-center gap-1 active:bg-blue-800"
      onPress={() => router.push('/profile/new-suggestion')}
      accessibilityRole="button"
      accessibilityLabel="Crear nueva sugerencia"
    >
      <Ionicons name="add" size={16} color={colors.white} />
      <Text className="text-white text-sm font-bold">Nueva</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Mis sugerencias"
        subtitle="Correcciones enviadas"
        onBack={() => router.back()}
        backLabel="Volver al perfil"
        rightAction={newSuggestionAction}
      />

      {isLoading ? (
        <ScreenState
          title="Cargando sugerencias"
          message="Estamos consultando tus contribuciones."
          isLoading
        />
      ) : errorMessage && items.length === 0 ? (
        <ScreenState
          title="No pudimos cargar tus sugerencias"
          message={errorMessage}
          icon="cloud-offline-outline"
          actionLabel="Reintentar"
          onAction={() => void load()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SuggestionCard item={item} />}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          ListHeaderComponent={
            <View className="gap-3">
              <View className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <Text className="text-sm font-semibold text-blue-900">
                  Envío privado por correo
                </Text>
                <Text className="text-sm text-blue-800 mt-1 leading-5">
                  Las nuevas sugerencias se envían directamente al equipo de ColectiGO y no se
                  guardan en este historial. Aquí solo verás contribuciones anteriores.
                </Text>
              </View>
              {errorMessage ? (
                <ErrorBanner
                  message={errorMessage}
                  actionLabel="Reintentar"
                  onAction={() => void load()}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <ScreenState
              title="No tienes contribuciones anteriores"
              message="Puedes enviarnos por correo una corrección de recorrido, tarifa, horario o punto de parada."
              icon="git-branch-outline"
              actionLabel="Crear mi primera sugerencia"
              onAction={() => router.push('/profile/new-suggestion')}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void load(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}
