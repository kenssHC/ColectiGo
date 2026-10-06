import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { routesService } from '../../src/services/routes.service';
import { suggestionsService } from '../../src/services/suggestions.service';
import type { SuggestionType, TransportRoute } from '@collectigo/shared';

const MAX_DESCRIPTION_LENGTH = 1000;

const TYPE_OPTIONS: Array<{ key: SuggestionType; label: string; icon: string }> = [
  { key: 'stop_position', label: 'Posición de parada', icon: 'location-outline' },
  { key: 'route_path', label: 'Recorrido', icon: 'git-branch-outline' },
  { key: 'fare', label: 'Tarifa', icon: 'cash-outline' },
  { key: 'schedule', label: 'Horario', icon: 'time-outline' },
  { key: 'other', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
];

export default function NewSuggestionScreen() {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [type, setType] = useState<SuggestionType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    routesService
      .getAll()
      .then((data) => {
        if (active) setRoutes(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar las rutas',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingRoutes(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
        [{ text: 'Entendido', onPress: () => router.back() }],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo enviar la sugerencia',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#374151" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 flex-1">Nueva sugerencia</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

          <View className="gap-2">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              1. ¿Sobre qué ruta?
            </Text>
            {isLoadingRoutes ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#1D4ED8" />
              </View>
            ) : routes.length === 0 ? (
              <Text className="text-sm text-gray-400 py-4 text-center">
                No hay rutas disponibles
              </Text>
            ) : (
              routes.map((route) => {
                const isSelected = routeId === route.id;
                return (
                  <TouchableOpacity
                    key={route.id}
                    className={`flex-row items-center gap-3 rounded-xl px-4 py-3 border ${
                      isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100'
                    }`}
                    onPress={() => setRouteId(route.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ruta ${route.name}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: route.color }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                        {route.name}
                      </Text>
                      <Text className="text-xs text-gray-400 capitalize">
                        {route.type} · S/ {route.fare.toFixed(2)}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color="#1D4ED8" />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              2. ¿Qué quieres corregir?
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => {
                const isSelected = type === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-2 border ${
                      isSelected ? 'bg-blue-700 border-blue-700' : 'bg-white border-gray-200'
                    }`}
                    onPress={() => setType(option.key)}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={isSelected ? 'white' : '#6B7280'}
                    />
                    <Text
                      className={`text-xs font-medium ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              3. Cuéntanos el detalle
            </Text>
            <TextInput
              className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 min-h-[100px]"
              placeholder="Ej. La parada de Av. Giráldez ahora está una cuadra más al norte…"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <Text className="text-xs text-gray-300 self-end">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </View>

          <Button
            label="Enviar sugerencia"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canSubmit}
            size="lg"
            leftIcon={<Ionicons name="paper-plane-outline" size={16} color="white" />}
          />

          <View className="h-6" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
