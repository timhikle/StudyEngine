import { useState, useEffect, useRef } from 'react';

type Listener = () => void;
type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;
type GetState<T> = () => T;
type StoreCreator<T> = (set: SetState<T>, get: GetState<T>) => T;

type UseStore<T> = {
  <U>(selector: (state: T) => U): U;
  getState: GetState<T>;
  setState: SetState<T>;
};

export function create<T extends Record<string, any>>(initializer: StoreCreator<T>): UseStore<T> {
  const listeners = new Set<Listener>();
  let state: T;

  const getState = () => state;

  const setState = (partial: any) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    const prev = state;
    state = { ...state, ...next } as T;
    if (state !== prev) {
      listeners.forEach((l) => l());
    }
  };

  state = initializer(setState, getState);

  function useStore<U>(selector: (state: T) => U): U {
    const selectorRef = useRef(selector);
    const [, forceUpdate] = useState(0);
    const currentSlice = useRef(selector(state));

    selectorRef.current = selector;

    useEffect(() => {
      const listener = () => {
        const newSlice = selectorRef.current(state);
        if (newSlice !== currentSlice.current) {
          currentSlice.current = newSlice;
          forceUpdate((n) => n + 1);
        }
      };
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }, []);

    return selector(state);
  }

  useStore.getState = getState;
  useStore.setState = setState;

  return useStore as unknown as UseStore<T>;
}
