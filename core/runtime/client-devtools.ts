import type { RpcClientImpl } from "./rpc.ts";
import { map } from "./async/async-generator.ts";
import { createEventEmitter, EventEmitter } from "./async/event-emitter.ts";

export const devtoolsKey = "@pbkit/devtools";

export function getDevtoolsConfig(): DevtoolsConfig {
  return (globalThis as any)[devtoolsKey] ||= createDevtoolsConfig();
}

export interface DevtoolsConfig extends EventEmitter<Events> {
  requestIdCounter: number;
}
function createDevtoolsConfig(): DevtoolsConfig {
  const devtoolsConfig: DevtoolsConfig = {
    requestIdCounter: 0,
    ...createEventEmitter(),
  };
  return devtoolsConfig;
}

export interface WrapRpcClientImplConfig {
  rpcClientImpl: RpcClientImpl;
  devtoolsConfig: DevtoolsConfig;
  tags: string[];
}
export function wrapRpcClientImpl<TMetadata, THeader, TTrailer>(
  config: WrapRpcClientImplConfig,
): RpcClientImpl<TMetadata, THeader, TTrailer> {
  return function devtoolsRpcClientImpl(methodDescriptor) {
    const { rpcClientImpl, devtoolsConfig, tags } = config;
    const rpcMethodImpl = rpcClientImpl(methodDescriptor);
    return function devtoolsRpcMethodImpl(req, metadata) {
      const requestId = devtoolsConfig.requestIdCounter++;
      devtoolsConfig.emit("request", {
        requestId,
        servicePath: methodDescriptor.service.serviceName,
        rpcName: methodDescriptor.methodName,
        metadataJson: JSON.stringify(metadata),
        tags,
      });
      const rpcMethodResult = rpcMethodImpl(
        map(req, (payload) => {
          devtoolsConfig.emit("request-payload", {
            requestId,
            payloadJson: JSON.stringify(payload), // TODO: encode as json
            payloadProto: methodDescriptor.requestType.serializeBinary(payload),
          });
          return payload;
        }),
        metadata,
      );
      const resAsyncGenerator = map(rpcMethodResult[0], (payload) => {
        devtoolsConfig.emit("response-payload", {
          requestId,
          payloadJson: JSON.stringify(payload), // TODO: encode as json
          payloadProto: methodDescriptor.responseType.serializeBinary(payload),
        });
        return payload;
      });
      const headerPromise = rpcMethodResult[1].then((header) => {
        devtoolsConfig.emit("response", {
          requestId,
          headerJson: JSON.stringify(header),
        });
        return header;
      });
      const trailerPromise = rpcMethodResult[2].then((trailer) => {
        devtoolsConfig.emit("response-trailer", {
          requestId,
          trailerJson: JSON.stringify(trailer),
        });
        return trailer;
      });
      return [resAsyncGenerator, headerPromise, trailerPromise];
    };
  };
}

interface Events {
  "request": {
    requestId: number;
    servicePath: string;
    rpcName: string;
    metadataJson: string;
    tags: string[];
  };
  "request-payload": {
    requestId: number;
    payloadJson: string;
    payloadProto: Uint8Array;
  };
  "response": {
    requestId: number;
    headerJson: string;
  };
  "response-payload": {
    requestId: number;
    payloadJson: string;
    payloadProto: Uint8Array;
  };
  "response-trailer": {
    requestId: number;
    trailerJson: string;
  };
}
