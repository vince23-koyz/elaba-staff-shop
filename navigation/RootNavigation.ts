import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './Navigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    const args = params !== undefined 
      ? [name, params] as const
      : [name] as const;
    navigationRef.navigate(...(args as any));
  } else {
    console.warn('[RootNavigation] navigationRef not ready:', name, params);
  }
}
