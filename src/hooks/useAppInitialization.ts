import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { buildEnv } from '../utils/buildEnvironment';
import { isWeb } from '../utils/platform';
import { withRetry } from '../utils/retryLogic';

interface InitializationState {
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
}

const FONT_LOAD_TIMEOUT = 5000;

async function loadFontsWithTimeout(): Promise<void> {
  const loadPromise = Font.loadAsync({
    ...Ionicons.font,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Font loading timeout')), FONT_LOAD_TIMEOUT);
  });

  return Promise.race([loadPromise, timeoutPromise]);
}

export function useAppInitialization() {
  const [state, setState] = useState<InitializationState>({
    isLoading: true,
    error: null,
    isInitialized: false,
  });

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        if (!isWeb) {
          await SplashScreen.preventAutoHideAsync();
        }

        await withRetry(
          async () => {
            await loadFontsWithTimeout();
          },
          {
            maxAttempts: 2,
            baseDelay: 500,
            onRetry: (attempt) => {
              console.log(`Retrying font load, attempt ${attempt}`);
            },
          }
        );

        if (!mounted) return;

        setState({
          isLoading: false,
          error: null,
          isInitialized: true,
        });

        if (!isWeb) {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.error('Initialization error:', error);

        if (!mounted) return;

        const errorObj = error instanceof Error ? error : new Error('Unknown initialization error');

        setState({
          isLoading: false,
          error: errorObj,
          isInitialized: false,
        });

        if (buildEnv.isDev) {
          Alert.alert(
            'Initialization Error',
            errorObj.message,
            [
              {
                text: 'Retry',
                onPress: () => {
                  setState({ isLoading: true, error: null, isInitialized: false });
                  initialize();
                },
              },
              { text: 'Continue', style: 'cancel' },
            ]
          );
        }

        if (!isWeb) {
          await SplashScreen.hideAsync();
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  const retry = () => {
    setState({ isLoading: true, error: null, isInitialized: false });
  };

  return {
    ...state,
    retry,
  };
}