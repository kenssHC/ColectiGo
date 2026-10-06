import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { SuggestionType, TransportRoute } from '@collectigo/shared';
import { Button } from '../../src/components/ui/Button';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { Input } from '../../src/components/ui/Input';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ScreenState } from '../../src/components/ui/ScreenState';
import { routesService } from '../../src/services/routes.service';
import { suggestionsService } from '../../src/services/suggestions.service';
import { colors } from '../../src/theme/tokens';

const MAX_DESCRIPTION_LENGTH = 1000;

const TYPE_OPTIONS: Array<{
  key: SuggestionType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'stop_position', label: 'Posición de parada', icon: 'location-outline' },
  { key: 'route_path', label: 'Recorrido', icon: 'git-branch-outline' },
  { key: 'fare', label: 'Tarifa', icon: 'cash-outline' },
  { key: 'schedule', label: 'Horario', icon: 'time-outline' },
  { key: 'other', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
];

interface RouteRowProps {
  route: TransportRoute;
  isSelected: boolean;
  onPress: () => void;
}

function RouteRow({ route, isSelected, onPress }: RouteRowProps): ReactElement {
  return (
    <Pressable
      className={`min-h-16 flex-row items-center gap-3 rounded-2xl px-4 py-3 border-2 ${
        isSelected ? 'bg-blue-50 border-blue-700' : 'bg-white border-slate-200'
      } active:opacity-80`}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`Ruta ${route.name}, ${route.type}, S/ ${route.fare.toFixed(2)}`}
      accessibilityState={{ checked: isSelected }}
    >
      <View className="w-3 h-3 rounded-full" style={{ backgroundColor: route.color }} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {route.name}
        </Text>
        <Text className="text-xs text-slate-600 capitalize">
          {route.type} · S/ {route.fare.toFixed(2)}
        </Text>
      </View>
      {isSelected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

export default function NewSuggestionScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [type, setType] = useState<SuggestionType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeQuery, setRouteQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const loadRoutes = useCallback(async (): Promise<void> => {
    setIsLoadingRoutes(true);
    setErrorMessage(null);
    try {
      setRoutes(await routesService.getAll());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar las rutas');
    } finally {
      setIsLoadingRoutes(false);
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const selectedRoute = routes.find((route) => route.id === routeId) ?? null;
  const filteredRoutes = useMemo(() => {
    const query = routeQuery.trim().toLocaleLowerCase('es');
    if (!query) return routes;
    return routes.filter(
      (route) =>
        route.name.toLocaleLowerCase('es').includes(query) ||
        route.type.toLocaleLowerCase('es').includes(query),
    );
  }, [routeQuery, routes]);
  const canSubmit = routeId !== null && type !== null && description.trim().length > 0;

  async function handleSubmit(): Promise<void> {
    if (!routeId || !type || !description.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await suggestionsService.create(routeId, {
        type,
        description: description.trim(),
      });
      Alert.alert(
        'Sugerencia enviada',
        'Gracias por ayudar a mejorar las rutas. Revisaremos tu sugerencia pronto.',
        [{ text: 'Entendido', onPress: (): void => router.back() }],
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo enviar la sugerencia');
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectRoute(route: TransportRoute): void {
    setRouteId(route.id);
    setIsPickerOpen(false);
    setRouteQuery('');
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Nueva sugerencia"
        subtitle="Ayúdanos a mantener las rutas al día"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            gap: 24,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <ErrorBanner
              message={errorMessage}
              {...(routes.length === 0
                ? { actionLabel: 'Reintentar', onAction: () => void loadRoutes() }
                : {})}
            />
          ) : null}

          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-800">1. ¿Sobre qué ruta?</Text>
            <Pressable
              className="min-h-16 flex-row items-center gap-3 rounded-2xl px-4 py-3 border border-slate-300 bg-white active:bg-slate-50"
              onPress={() => setIsPickerOpen(true)}
              disabled={isLoadingRoutes || routes.length === 0}
              accessibilityRole="button"
              accessibilityLabel={
                selectedRoute ? `Ruta seleccionada: ${selectedRoute.name}` : 'Seleccionar ruta'
              }
              accessibilityState={{ disabled: isLoadingRoutes || routes.length === 0 }}
            >
              <View
                className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center"
                style={
                  selectedRoute ? { borderWidth: 4, borderColor: selectedRoute.color } : undefined
                }
              >
                <Ionicons name="bus-outline" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-600">Ruta</Text>
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {isLoadingRoutes
                    ? 'Cargando rutas…'
                    : (selectedRoute?.name ??
                      (routes.length === 0 ? 'No hay rutas disponibles' : 'Selecciona una ruta'))}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-800">2. ¿Qué quieres corregir?</Text>
            <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
              {TYPE_OPTIONS.map((option) => {
                const isSelected = type === option.key;
                return (
                  <Pressable
                    key={option.key}
                    className={`min-h-11 flex-row items-center justify-center gap-2 rounded-full px-4 border ${
                      isSelected ? 'bg-blue-700 border-blue-700' : 'bg-white border-slate-300'
                    }`}
                    onPress={() => setType(option.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: isSelected }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={isSelected ? colors.white : colors.textSecondary}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-800">3. Cuéntanos el detalle</Text>
            <TextInput
              className="bg-white rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 min-h-32"
              placeholder="Ej. La parada de Av. Giráldez ahora está una cuadra más al norte…"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={MAX_DESCRIPTION_LENGTH}
              accessibilityLabel="Detalle de la sugerencia"
              accessibilityHint="Describe qué información debería corregirse"
            />
            <Text className="text-xs text-slate-600 self-end">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </View>

          <Button
            label="Enviar sugerencia"
            loadingLabel="Enviando sugerencia…"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canSubmit}
            size="lg"
            leftIcon={<Ionicons name="paper-plane-outline" size={18} color={colors.white} />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <View
          className="flex-1 bg-slate-50"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <ScreenHeader
            title="Selecciona una ruta"
            subtitle={`${filteredRoutes.length} disponibles`}
            onBack={() => setIsPickerOpen(false)}
            backLabel="Cerrar selector de rutas"
          />
          <View className="px-4 py-3">
            <Input
              placeholder="Buscar por nombre o tipo"
              value={routeQuery}
              onChangeText={setRouteQuery}
              accessibilityLabel="Buscar ruta"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filteredRoutes}
            keyExtractor={(route) => route.id}
            renderItem={({ item }) => (
              <RouteRow
                route={item}
                isSelected={routeId === item.id}
                onPress={() => selectRoute(item)}
              />
            )}
            contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 8, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="radiogroup"
            ListEmptyComponent={
              <ScreenState
                title="No encontramos esa ruta"
                message="Prueba con otro nombre o tipo de vehículo."
                icon="search-outline"
                actionLabel="Limpiar búsqueda"
                onAction={() => setRouteQuery('')}
              />
            }
          />
        </View>
      </Modal>
    </View>
  );
}
