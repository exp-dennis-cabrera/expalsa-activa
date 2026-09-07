import {
  Client,
  ReconnectionTimeMode,
  TickerStrategy,
  type IMessage,
  type StompSubscription,
} from '@stomp/stompjs';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '../context/AuthContext';
import { getRealtimeAccessToken } from '../api/client';


const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080';


export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'forbidden';


type RealtimeListener =
  (message: IMessage) => void;


interface SubscriptionEntry {
  listeners: Set<RealtimeListener>;
  subscription?: StompSubscription;
}


interface RealtimeContextValue {
  status: RealtimeStatus;
  connected: boolean;

  subscribe: (
    destination: string,
    listener: RealtimeListener,
  ) => () => void;
}


const RealtimeContext =
  createContext<RealtimeContextValue | null>(
    null
  );


function buildRealtimeUrl(): string {
  const url =
    new URL(
      API_BASE_URL,
      window.location.origin
    );

  url.protocol =
    url.protocol === 'https:'
      ? 'wss:'
      : 'ws:';

  url.pathname =
    `${url.pathname.replace(/\/+$/, '')}/ws-native`;

  url.search = '';
  url.hash = '';

  return url.toString();
}


function detachPhysicalSubscriptions(
  registry: Map<string, SubscriptionEntry>
) {
  for (const entry of registry.values()) {
    entry.subscription = undefined;
  }
}


function attachPhysicalSubscription(
  client: Client,
  destination: string,
  entry: SubscriptionEntry
) {
  if (
    !client.connected ||
    entry.subscription ||
    entry.listeners.size === 0
  ) {
    return;
  }

  try {
    entry.subscription =
      client.subscribe(
        destination,
        (message) => {
          /*
           * Fan-out local.
           *
           * Un solo SUBSCRIBE STOMP puede alimentar
           * múltiples componentes React.
           */
          for (
            const listener of
              Array.from(entry.listeners)
          ) {
            try {
              listener(message);
            } catch (error) {
              /*
               * Nunca imprimimos message.body:
               * podría contener información sensible.
               */
              console.error(
                `[realtime] listener falló para ${destination}`,
                error
              );
            }
          }
        }
      );
  } catch {
    entry.subscription = undefined;
  }
}


export function RealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {

  const {
    isAuthenticated,
    userId,
  } = useAuth();


  const clientRef =
    useRef<Client | null>(null);


  const registryRef =
    useRef<
      Map<string, SubscriptionEntry>
    >(
      new Map()
    );


  /*
   * Si Spring informa que el JWT fue rechazado,
   * obligamos al siguiente CONNECT a intentar refresh.
   */
  const forceTokenRefreshRef =
    useRef(false);


  /*
   * Pequeño jitter por sesión.
   *
   * Si reiniciamos backend con cientos de navegadores,
   * no todos intentan regresar exactamente al mismo ms.
   */
  const reconnectBaseMs =
    useRef(
      1200 +
        Math.floor(
          Math.random() * 700
        )
    ).current;


  const [
    status,
    setStatus,
  ] =
    useState<RealtimeStatus>(
      'idle'
    );


  const subscribe =
    useCallback(
      (
        destination: string,
        listener: RealtimeListener
      ) => {

        if (
          !destination ||
          !destination.startsWith('/')
        ) {
          throw new Error(
            'Destination STOMP inválido.'
          );
        }


        let entry =
          registryRef.current.get(
            destination
          );


        if (!entry) {
          entry = {
            listeners:
              new Set<RealtimeListener>(),
          };

          registryRef.current.set(
            destination,
            entry
          );
        }


        entry.listeners.add(
          listener
        );


        const client =
          clientRef.current;


        if (
          client?.connected
        ) {
          attachPhysicalSubscription(
            client,
            destination,
            entry
          );
        }


        /*
         * Cleanup React.
         */
        return () => {
          const current =
            registryRef.current.get(
              destination
            );

          if (!current) {
            return;
          }

          current.listeners.delete(
            listener
          );


          if (
            current.listeners.size === 0
          ) {
            try {
              current.subscription
                ?.unsubscribe();
            } catch {
              // El socket puede haber cerrado antes.
            }

            registryRef.current.delete(
              destination
            );
          }
        };
      },
      []
    );


  useEffect(() => {

    if (
      !isAuthenticated ||
      !userId
    ) {
      setStatus('idle');
      return;
    }


    let disposed = false;


    const client =
      new Client({

        /*
         * WebSocket nativo.
         *
         * No SockJS.
         * No /info.
         */
        brokerURL:
          buildRealtimeUrl(),


        /*
         * Si WebSocket abre pero STOMP CONNECT
         * no completa, no esperamos indefinidamente.
         */
        connectionTimeout:
          12_000,


        /*
         * Reconexión centralizada.
         */
        reconnectDelay:
          reconnectBaseMs,

        reconnectTimeMode:
          ReconnectionTimeMode.EXPONENTIAL,

        maxReconnectDelay:
          15_000,


        /*
         * Importante para suspend/resume y sockets
         * que el navegador tarda en considerar muertos.
         */
        discardWebsocketOnCommFailure:
          true,


        /*
         * Heartbeats negociados también por Spring.
         */
        heartbeatIncoming:
          10_000,

        heartbeatOutgoing:
          10_000,

        heartbeatStrategy:
          TickerStrategy.Worker,

        heartbeatToleranceMultiplier:
          2.5,


        /*
         * Nunca activar debug aquí.
         *
         * Los logs STOMP pueden contener headers
         * de autenticación.
         */
        debug: () => {},


        /*
         * Se ejecuta antes de CADA intento/reintento.
         */
        beforeConnect:
          async (
            stompClient
          ) => {

            if (disposed) {
              return;
            }

            setStatus(
              'connecting'
            );


            const forceRefresh =
              forceTokenRefreshRef.current;


            const token =
              await getRealtimeAccessToken(
                forceRefresh
              );


            /*
             * Si el refresh fue exitoso, el token
             * almacenado ya fue sustituido.
             *
             * Si no lo fue y Spring rechaza este
             * CONNECT, onStompError vuelve a marcarlo.
             */
            forceTokenRefreshRef.current =
              false;


            stompClient.connectHeaders =
              {
                token,
              };
          },


        onConnect:
          () => {

            if (disposed) {
              return;
            }

            forceTokenRefreshRef.current =
              false;

            setStatus(
              'connected'
            );


            /*
             * STOMP no conserva las subscriptions
             * después de una reconexión.
             *
             * Restauramos el registry completo.
             */
            for (
              const [
                destination,
                entry,
              ] of
                registryRef.current
            ) {

              entry.subscription =
                undefined;

              attachPhysicalSubscription(
                client,
                destination,
                entry
              );
            }
          },


        onDisconnect:
          () => {

            detachPhysicalSubscriptions(
              registryRef.current
            );

            if (!disposed) {
              setStatus(
                'disconnected'
              );
            }
          },


        onWebSocketClose:
          () => {

            detachPhysicalSubscriptions(
              registryRef.current
            );

            if (!disposed) {
              setStatus(
                'disconnected'
              );
            }
          },


        onWebSocketError:
          () => {

            if (!disposed) {
              setStatus(
                'disconnected'
              );
            }
          },


        onHeartbeatLost:
          () => {

            if (!disposed) {
              setStatus(
                'disconnected'
              );
            }
          },


        onStompError:
          (frame) => {

            if (disposed) {
              return;
            }


            const message =
              (
                frame.headers.message ||
                ''
              ).toLowerCase();


            const permissionError =
              [
                'access denied',
                'accessdenied',
                'forbidden',
              ].some(
                (value) =>
                  message.includes(
                    value
                  )
              );


            if (permissionError) {

              /*
               * La autorización siempre la decide Spring.
               *
               * Un ERROR de permisos puede hacer que Spring
               * cierre la conexión completa. No desactivamos
               * permanentemente el RealtimeProvider porque
               * este socket es compartido por muchos dominios.
               *
               * StompJS recuperará el transporte.
               *
               * Los módulos NO deben construir destinations
               * arbitrarios desde entrada del usuario.
               */
              setStatus(
                'disconnected'
              );

              client.forceDisconnect();

              return;
            }


            const authenticationError =
              [
                'unauthorized',
                'authentication',
                'not authenticated',
                'invalid token',
                'expired token',
                'jwt',
              ].some(
                (value) =>
                  message.includes(
                    value
                  )
              );


            if (
              authenticationError
            ) {
              forceTokenRefreshRef.current =
                true;
            }


            setStatus(
              'disconnected'
            );


            /*
             * onWebSocketClose hará que StompJS
             * aplique su propio backoff.
             */
            client.forceDisconnect();
          },
      });


    clientRef.current =
      client;


    setStatus(
      'connecting'
    );


    client.activate();


    return () => {

      disposed = true;

      if (
        clientRef.current ===
        client
      ) {
        clientRef.current =
          null;
      }

      detachPhysicalSubscriptions(
        registryRef.current
      );

      /*
       * Cambio de usuario/logout:
       * nunca dejamos el socket anterior vivo.
       */
      void client.deactivate({
        force: true,
      });
    };

  }, [
    isAuthenticated,
    userId,
    reconnectBaseMs,
  ]);


  const value =
    useMemo<RealtimeContextValue>(
      () => ({
        status,
        connected:
          status ===
          'connected',
        subscribe,
      }),
      [
        status,
        subscribe,
      ]
    );


  return (
    <RealtimeContext.Provider
      value={value}
    >
      {children}
    </RealtimeContext.Provider>
  );
}


export function useRealtime() {
  const context =
    useContext(
      RealtimeContext
    );

  if (!context) {
    throw new Error(
      'useRealtime debe usarse dentro de RealtimeProvider'
    );
  }

  return context;
}


/*
 * Hook recomendado para módulos.
 *
 * El callback puede cambiar en cada render sin destruir
 * la subscription STOMP física.
 */
export function useRealtimeSubscription(
  destination:
    | string
    | null
    | undefined,
  listener: RealtimeListener,
  enabled = true
) {

  const {
    subscribe,
  } =
    useRealtime();


  const listenerRef =
    useRef(
      listener
    );


  listenerRef.current =
    listener;


  useEffect(() => {

    if (
      !enabled ||
      !destination
    ) {
      return;
    }


    return subscribe(
      destination,
      (message) =>
        listenerRef.current(
          message
        )
    );

  }, [
    destination,
    enabled,
    subscribe,
  ]);
}
