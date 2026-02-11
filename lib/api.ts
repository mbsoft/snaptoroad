import polyline from '@mapbox/polyline';
import { ApiEndpoint, ApiResult, EdgeInfo, MapPoint, NavigationLeg, RequestType, SnapToRoadResponse, SnappedPointInfo } from './types';

export { fetchSnapToRoad } from './snapToRoad';

export async function fetchApi(
  requestType: RequestType,
  points: MapPoint[],
  apiKey: string,
  baseUrl: ApiEndpoint,
  debug: boolean,
  signal?: AbortSignal
): Promise<ApiResult> {
  switch (requestType) {
    case 'snap2road':
      return fetchSnap(points, apiKey, baseUrl, debug, signal);
    case 'directions':
      return fetchDirectionsOrNav('directions', points, apiKey, baseUrl, debug, signal);
    case 'navigation':
      return fetchDirectionsOrNav('navigation', points, apiKey, baseUrl, debug, signal);
  }
}

function extractWayIdInfo(roadInfo: unknown[], decodedRoute: [number, number][]) {
  const edgeBreakPoints: [number, number][] = [];
  const edgeInfoList: EdgeInfo[] = [];
  const offsets: number[] = [];

  type WayIdEntry = { offset?: number; length?: number; value?: unknown };

  for (const entry of roadInfo as WayIdEntry[]) {
    const idx = entry.offset;
    if (idx !== undefined && idx >= 0 && idx < decodedRoute.length) {
      edgeBreakPoints.push(decodedRoute[idx]);
      edgeInfoList.push({ way_id: entry.value });
      offsets.push(idx);
    }
  }

  const edgeMidPoints: [number, number][] = offsets.map((startIdx, i) => {
    const endIdx = i + 1 < offsets.length
      ? offsets[i + 1]
      : decodedRoute.length - 1;
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (midIdx === startIdx && endIdx > startIdx) {
      const s = decodedRoute[startIdx];
      const e = decodedRoute[endIdx];
      return [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
    }
    return decodedRoute[midIdx];
  });

  return { edgeBreakPoints, edgeInfoList, edgeOffsets: offsets, edgeMidPoints };
}

function extractEdgeInfo(debugInfo: unknown, decodedRoute: [number, number][]) {
  const edgeBreakPoints: [number, number][] = [];
  const edgeInfoList: EdgeInfo[] = [];
  const offsets: number[] = [];

  // Snap-to-road: debug_info is an array [{ edge_info: [...] }]
  // Directions:   debug_info is an object { edge_info: [...] }
  type EdgeInfoEntry = EdgeInfo & { offset: number };
  type DebugShape = { edge_info?: EdgeInfoEntry[] };
  let edgeInfoArr: EdgeInfoEntry[] | undefined;
  if (Array.isArray(debugInfo)) {
    edgeInfoArr = (debugInfo as DebugShape[])[0]?.edge_info;
  } else if (debugInfo && typeof debugInfo === 'object') {
    edgeInfoArr = (debugInfo as DebugShape).edge_info;
  }

  if (edgeInfoArr) {
    for (const edge of edgeInfoArr) {
      const idx = edge.offset;
      if (idx >= 0 && idx < decodedRoute.length) {
        edgeBreakPoints.push(decodedRoute[idx]);
        edgeInfoList.push(edge);
        offsets.push(idx);
      }
    }
  }

  const edgeMidPoints: [number, number][] = offsets.map((startIdx, i) => {
    const endIdx = i + 1 < offsets.length
      ? offsets[i + 1]
      : decodedRoute.length - 1;
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (midIdx === startIdx && endIdx > startIdx) {
      const s = decodedRoute[startIdx];
      const e = decodedRoute[endIdx];
      return [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
    }
    return decodedRoute[midIdx];
  });

  return { edgeBreakPoints, edgeInfoList, edgeOffsets: offsets, edgeMidPoints };
}

async function fetchSnap(
  points: MapPoint[],
  apiKey: string,
  baseUrl: ApiEndpoint,
  debug: boolean,
  signal?: AbortSignal
): Promise<ApiResult> {
  const path = points.map((p) => `${p.lat},${p.lng}`).join('|');
  const radiuses = points.map(() => '250').join('|');

  const url = new URL(`${baseUrl}/snapToRoads/json`);
  url.searchParams.set('path', path);
  url.searchParams.set('mode', 'car');
  url.searchParams.set('radiuses', radiuses);
  url.searchParams.set('interpolate', 'true');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('option', 'flexible');
  url.searchParams.set('road_info', 'way_id|max_speed');
  url.searchParams.set('detail', 'true');
  if (debug) {
    url.searchParams.set('debug', 'true');
  }

  const requestUrl = url.toString();
  const res = await fetch(requestUrl, { signal });
  if (!res.ok) {
    throw new Error(`Snap-to-road API error: ${res.status} ${res.statusText}`);
  }

  const data: SnapToRoadResponse = await res.json();

  if (!data.geometry || data.geometry.length === 0) {
    throw new Error(data.msg || 'No geometry in snap-to-road response');
  }

  const decodedRoute = polyline.decode(data.geometry[0]);

  let edgeResult = extractEdgeInfo(data.debug_info, decodedRoute);
  if (edgeResult.edgeBreakPoints.length === 0 && Array.isArray(data.road_info) && data.road_info.length > 0) {
    const ri = data.road_info[0] as { way_id?: unknown[] };
    if (Array.isArray(ri?.way_id) && ri.way_id.length > 0) {
      edgeResult = extractWayIdInfo(ri.way_id, decodedRoute);
    }
  }

  const { edgeBreakPoints, edgeInfoList, edgeOffsets, edgeMidPoints } = edgeResult;

  const snappedPointsByIndex = new Map<number, SnappedPointInfo>();
  if (data.snappedPoints) {
    for (const sp of data.snappedPoints) {
      if (sp.originalIndex !== undefined) {
        const info: SnappedPointInfo = {};
        if (sp.name) info.name = sp.name;
        if (sp.bearing !== undefined) info.bearing = sp.bearing;
        if (sp.distance !== undefined) info.distance = sp.distance;
        snappedPointsByIndex.set(sp.originalIndex, info);
      }
    }
  }

  return { requestUrl, response: data, decodedRoute, edgeBreakPoints, edgeOffsets, edgeMidPoints, edgeInfoList, snappedPointsByIndex };
}

async function fetchDirectionsOrNav(
  type: 'directions' | 'navigation',
  points: MapPoint[],
  apiKey: string,
  baseUrl: ApiEndpoint,
  debug: boolean,
  signal?: AbortSignal
): Promise<ApiResult> {
  const endpoint = type === 'directions'
    ? `${baseUrl}/directions/json`
    : `${baseUrl}/navigation/json`;

  const url = new URL(endpoint);
  url.searchParams.set('origin', `${points[0].lat},${points[0].lng}`);
  url.searchParams.set('destination', `${points[points.length - 1].lat},${points[points.length - 1].lng}`);

  if (points.length > 2) {
    const waypoints = points
      .slice(1, -1)
      .map((p) => `${p.lat},${p.lng}`)
      .join('|');
    url.searchParams.set('waypoints', waypoints);
  }

  url.searchParams.set('mode', 'car');
  url.searchParams.set('key', apiKey);
  if (type === 'directions') {
    url.searchParams.set('option', 'flexible');
    url.searchParams.set('road_info', 'max_speed');
    if (debug) {
      url.searchParams.set('annotations', 'true');
      url.searchParams.set('debug', 'true');
    }
  } else if (debug) {
    url.searchParams.set('debug', 'true');
  }

  const requestUrl = url.toString();
  const res = await fetch(requestUrl, { signal });
  if (!res.ok) {
    throw new Error(`${type} API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Extract geometry from routes[0].geometry
  const routes = data.routes;
  if (!routes || routes.length === 0 || !routes[0].geometry) {
    throw new Error(data.msg || `No routes in ${type} response`);
  }

  const route = routes[0];
  // Navigation uses OSRM-format polylines (precision 6), Directions uses Google-format (precision 5)
  const precision = type === 'navigation' ? 6 : 5;
  const decodedRoute = polyline.decode(route.geometry, precision);
  const { edgeBreakPoints, edgeInfoList, edgeOffsets, edgeMidPoints } = extractEdgeInfo(route.debug_info, decodedRoute);

  // Extract legs for navigation responses only
  let navigationLegs: NavigationLeg[] | undefined;
  if (type === 'navigation' && Array.isArray(route.legs) && route.legs.length > 0) {
    navigationLegs = route.legs.map((leg: Record<string, unknown>) => ({
      distance: leg.distance as NavigationLeg['distance'],
      duration: leg.duration as NavigationLeg['duration'],
      start_location: leg.start_location as NavigationLeg['start_location'],
      end_location: leg.end_location as NavigationLeg['end_location'],
      steps: Array.isArray(leg.steps) ? leg.steps : [],
    }));
  }

  return {
    requestUrl,
    response: data,
    decodedRoute,
    edgeBreakPoints,
    edgeOffsets,
    edgeMidPoints,
    edgeInfoList,
    navigationLegs,
  };
}
