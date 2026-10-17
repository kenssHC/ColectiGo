import AsyncStorage from '@react-native-async-storage/async-storage';
import { adsConfig } from './ads.config';
import { GoogleRouteInterstitialGateway } from './google-route-interstitial.gateway';
import { RouteInterstitialController } from './route-interstitial.controller';
import { RouteInterstitialPolicy } from './route-interstitial.policy';

const policy = new RouteInterstitialPolicy(AsyncStorage);
const gateway = new GoogleRouteInterstitialGateway();

export const routeInterstitialService = new RouteInterstitialController(
  policy,
  gateway,
  adsConfig.enabled && adsConfig.testMode,
);
