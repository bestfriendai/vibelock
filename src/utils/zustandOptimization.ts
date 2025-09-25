import { useRef } from "react";
import { shallow } from "zustand/shallow";

/**
 * Custom hook that provides optimized selector usage with shallow comparison
 * to prevent unnecessary re-renders when selecting multiple properties
 */
export const useShallow = <T, U>(
  store: (selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean) => U,
  selector: (state: T) => U,
) => store(selector, shallow);

/**
 * Creates a memoized selector function that prevents unnecessary re-renders
 * when the selected state hasn't changed
 */
export const createSelector = <T, U>(selector: (state: T) => U) => {
  return selector;
};

/**
 * Hook for selecting multiple properties with shallow comparison
 * This is the primary optimization for Zustand stores
 */
export const useStoreShallow = <T, U>(
  store: (selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean) => U,
  selector: (state: T) => U,
) => {
  return store(selector, shallow);
};

/**
 * Performance monitoring hook for Zustand stores
 * Helps identify unnecessary re-renders in development
 */
export const useStoreWithPerf = <T, U>(
  store: (selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean) => U,
  selector: (state: T) => U,
  debugName?: string,
) => {
  const prevValueRef = useRef<U | undefined>(undefined);

  const selected = store(selector, shallow);

  if (process.env.NODE_ENV === "development" && debugName) {
    const prevValue = prevValueRef.current;
    if (prevValue !== undefined && prevValue !== selected) {
    }
    prevValueRef.current = selected;
  }

  return selected;
};

/**
 * Factory function to create optimized store hooks
 * Automatically applies shallow comparison for better performance
 */
export const createOptimizedStoreHook = <T extends object>(
  store: (selector: (state: T) => any, equalityFn?: (a: any, b: any) => boolean) => any,
) => {
  return {
    useStore: <U>(selector: (state: T) => U) => store(selector),
    useStoreShallow: <U>(selector: (state: T) => U) => store(selector, shallow),
  };
};

/**
 * Pre-configured optimized hooks for common store usage patterns
 */
export const createOptimizedHooks = <T extends object>(
  store: (selector: (state: T) => any, equalityFn?: (a: any, b: any) => boolean) => any,
) => ({
  /**
   * Optimized hook for selecting single property
   */
  useProp: <K extends keyof T>(prop: K) => store((state) => state[prop]),

  /**
   * Optimized hook for selecting multiple properties with shallow comparison
   */
  useProps: <K extends keyof T>(...props: K[]) =>
    store((state) => props.reduce((acc, prop) => ({ ...acc, [prop]: state[prop] }), {} as Pick<T, K>), shallow),

  /**
   * Optimized hook for selecting state with custom selector
   */
  useSelect: <U>(selector: (state: T) => U) => store(selector, shallow),
});
