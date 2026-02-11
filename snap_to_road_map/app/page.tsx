'use client';

import { useState, useCallback, useRef } from 'react';
import { MapPoint, EdgeInfo, NavigationLeg, RequestType, ApiEndpoint, API_ENDPOINTS, SnappedPointInfo } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import ApiKeyInput from '@/components/ApiKeyInput';
import MapView from '@/components/MapView';
import PointsPanel from '@/components/PointsPanel';
import JsonResponsePanel from '@/components/JsonResponsePanel';

export default function Home() {
  const [requestType, setRequestType] = useState<RequestType>('directions');
  const [endpoint, setEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0].value);
  const [apiKey, setApiKey] = useState('');
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [snappedRoute, setSnappedRoute] = useState<[number, number][] | null>(
    null
  );
  const [edgeBreakPoints, setEdgeBreakPoints] = useState<[number, number][] | null>(null);
  const [edgeOffsets, setEdgeOffsets] = useState<number[]>([]);
  const [edgeMidPoints, setEdgeMidPoints] = useState<[number, number][]>([]);
  const [edgeInfoList, setEdgeInfoList] = useState<EdgeInfo[]>([]);
  const [snappedPointsMap, setSnappedPointsMap] = useState<Map<number, SnappedPointInfo>>(new Map());
  const [navigationLegs, setNavigationLegs] = useState<NavigationLeg[]>([]);
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const [apiRequestUrl, setApiRequestUrl] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<object | null>(null);
  const [debug, setDebug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counterRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const callApi = useCallback(
    async (pts: MapPoint[], type?: RequestType, ep?: ApiEndpoint, dbg?: boolean) => {
      const rt = type ?? requestType;
      const base = ep ?? endpoint;
      const dbgFlag = dbg ?? debug;
      if (pts.length < 2 || !apiKey) return;

      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setSelectedEdgeIndex(null);

      try {
        const { requestUrl, response, decodedRoute, edgeBreakPoints: breaks, edgeOffsets: ofs, edgeMidPoints: mids, edgeInfoList: edges, snappedPointsByIndex, navigationLegs: legs } = await fetchApi(
          rt,
          pts,
          apiKey,
          base,
          dbgFlag,
          controller.signal
        );
        setApiRequestUrl(requestUrl);
        setApiResponse(response);
        setSnappedRoute(decodedRoute);
        setEdgeBreakPoints(breaks);
        setEdgeOffsets(ofs);
        setEdgeMidPoints(mids);
        setEdgeInfoList(edges);
        setSnappedPointsMap(snappedPointsByIndex ?? new Map());
        setNavigationLegs(legs ?? []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setApiRequestUrl(null);
        setApiResponse(null);
        setSnappedRoute(null);
        setEdgeBreakPoints(null);
        setEdgeOffsets([]);
        setEdgeMidPoints([]);
        setEdgeInfoList([]);
        setSnappedPointsMap(new Map());
        setNavigationLegs([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, requestType, endpoint, debug]
  );

  const handleApiKeySubmit = useCallback((key: string) => {
    setApiKey(key);
  }, []);

  const handleRequestTypeChange = useCallback(
    (type: RequestType) => {
      setRequestType(type);
      if (points.length >= 2 && apiKey) {
        callApi(points, type);
      }
    },
    [points, apiKey, callApi]
  );

  const handleEndpointChange = useCallback(
    (ep: ApiEndpoint) => {
      setEndpoint(ep);
      if (points.length >= 2 && apiKey) {
        callApi(points, undefined, ep);
      }
    },
    [points, apiKey, callApi]
  );

  const handleDebugChange = useCallback(
    (dbg: boolean) => {
      setDebug(dbg);
      if (points.length >= 2 && apiKey) {
        callApi(points, undefined, undefined, dbg);
      }
    },
    [points, apiKey, callApi]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      counterRef.current += 1;

      setPoints((prev) => {
        const newPoint: MapPoint = {
          id: counterRef.current,
          label: `P${prev.length + 1}`,
          lat,
          lng,
        };
        const next = [...prev, newPoint];
        callApi(next);
        return next;
      });
    },
    [callApi]
  );

  const handleClearPoints = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setPoints([]);
    setSnappedRoute(null);
    setEdgeBreakPoints(null);
    setEdgeOffsets([]);
    setEdgeMidPoints([]);
    setEdgeInfoList([]);
    setSnappedPointsMap(new Map());
    setNavigationLegs([]);
    setSelectedEdgeIndex(null);
    setApiRequestUrl(null);
    setApiResponse(null);
    setError(null);
    counterRef.current = 0;
  }, []);

  const handleRemovePoint = useCallback(
    (id: number) => {
      setPoints((prev) => {
        const next = prev.filter((p) => p.id !== id);
        // Relabel remaining points
        const relabeled = next.map((p, i) => ({
          ...p,
          label: `P${i + 1}`,
        }));
        if (relabeled.length >= 2) {
          callApi(relabeled);
        } else {
          setSnappedRoute(null);
          setEdgeBreakPoints(null);
          setEdgeOffsets([]);
          setEdgeMidPoints([]);
          setEdgeInfoList([]);
          setSnappedPointsMap(new Map());
          setNavigationLegs([]);
          setSelectedEdgeIndex(null);
          setApiRequestUrl(null);
          setApiResponse(null);
          setError(null);
        }
        return relabeled;
      });
    },
    [callApi]
  );

  const handlePointMove = useCallback(
    (id: number, lat: number, lng: number) => {
      setPoints((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, lat, lng } : p
        );
        if (next.length >= 2) {
          callApi(next);
        }
        return next;
      });
    },
    [callApi]
  );

  const handleEdgeSelect = useCallback((index: number | null) => {
    setSelectedEdgeIndex(index);
  }, []);

  const selectedEdge = selectedEdgeIndex !== null ? edgeInfoList[selectedEdgeIndex] ?? null : null;

  return (
    <>
      <ApiKeyInput
        onSubmit={handleApiKeySubmit}
        requestType={requestType}
        onRequestTypeChange={handleRequestTypeChange}
        endpoint={endpoint}
        onEndpointChange={handleEndpointChange}
        debug={debug}
        onDebugChange={handleDebugChange}
      />
      <div className="main-content">
        <div className="left-column">
          {apiKey ? (
            <MapView
              apiKey={apiKey}
              points={points}
              snappedRoute={snappedRoute}
              edgeBreakPoints={edgeBreakPoints}
              edgeOffsets={edgeOffsets}
              edgeMidPoints={edgeMidPoints}
              selectedEdgeIndex={selectedEdgeIndex}
              onMapClick={handleMapClick}
              onEdgeSelect={handleEdgeSelect}
              onPointMove={handlePointMove}
            />
          ) : (
            <div className="map-wrapper">
              <div className="map-placeholder">
                Enter your API key above to load the map
              </div>
            </div>
          )}
          <JsonResponsePanel
            requestUrl={apiRequestUrl}
            response={apiResponse}
            isLoading={isLoading}
            error={error}
          />
        </div>
        <PointsPanel
          points={points}
          snappedPointsMap={snappedPointsMap}
          navigationLegs={navigationLegs}
          onClear={handleClearPoints}
          onRemovePoint={handleRemovePoint}
          selectedEdge={selectedEdge}
          selectedEdgeIndex={selectedEdgeIndex}
          onEdgeDismiss={() => setSelectedEdgeIndex(null)}
        />
      </div>
    </>
  );
}
