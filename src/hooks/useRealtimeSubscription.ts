import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SubscriptionConfig {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

/**
 * Hook para gerenciar subscriptions realtime com cleanup automático.
 * Garante que cada componente tenha sua própria subscription isolada
 * e que o unsubscribe seja feito corretamente ao desmontar.
 */
export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);

  // Manter referência atualizada do callback sem recriar subscription
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    // Criar nome único para o canal para evitar conflitos entre componentes
    const channelName = `${config.table}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const subscribeConfig: any = {
      event: config.event || '*',
      schema: config.schema || 'public',
      table: config.table,
    };

    if (config.filter) {
      subscribeConfig.filter = config.filter;
    }

    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', subscribeConfig, (payload) => {
        callbackRef.current(payload);
      })
      .subscribe();

    return cleanup;
  }, [config.table, config.schema, config.event, config.filter, enabled, cleanup]);

  return { cleanup };
}

/**
 * Hook para fazer fetch com AbortController.
 * Previne race conditions cancelando requisições anteriores.
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getSignal = useCallback(() => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { getSignal, abort };
}

/**
 * Hook para rastrear estado de componente montado.
 * Usado para prevenir atualizações de estado após unmount.
 */
export function useMountedState() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  return isMounted;
}
