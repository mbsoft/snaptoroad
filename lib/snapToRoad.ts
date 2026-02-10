import polyline from '@mapbox/polyline';
import { EdgeInfo, MapPoint, SnapToRoadResponse } from './types';

export async function fetchSnapToRoad(
  points: MapPoint[],
  apiKey: string,
  signal?: AbortSignal
): Promise<{
  requestUrl: string;
  response: SnapToRoadResponse;
  decodedRoute: [number, number][];
  edgeBreakPoints: [number, number][];
  edgeMidPoints: [number, number][];
  edgeInfoList: EdgeInfo[];
}> {
  const path = points.map((p) => `${p.lat},${p.lng}`).join('|');
  const radiuses = points.map(() => '25').join('|');

  const url = new URL('https://api.nextbillion.io/snapToRoads/json');
  url.searchParams.set('path', path);
  url.searchParams.set('mode', 'car');
  url.searchParams.set('radiuses', radiuses);
  url.searchParams.set('interpolate', 'true');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('option', 'flexible');
  url.searchParams.set('road_info', 'way_id|max_speed');
  url.searchParams.set('detail', 'true');
  url.searchParams.set('debug', 'true');

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

  // Extract edge boundary points and full edge_info from debug_info
  const edgeBreakPoints: [number, number][] = [];
  const edgeInfoList: EdgeInfo[] = [];
  const offsets: number[] = [];
  const debugInfo = data.debug_info as Array<{ edge_info?: Array<EdgeInfo & { offset: number }> }> | undefined;
  if (debugInfo?.[0]?.edge_info) {
    for (const edge of debugInfo[0].edge_info) {
      const idx = edge.offset;
      if (idx >= 0 && idx < decodedRoute.length) {
        edgeBreakPoints.push(decodedRoute[idx]);
        edgeInfoList.push(edge);
        offsets.push(idx);
      }
    }
  }

  // Compute midpoint of each edge (halfway between this offset and the next)
  const edgeMidPoints: [number, number][] = offsets.map((startIdx, i) => {
    const endIdx = i + 1 < offsets.length
      ? offsets[i + 1]
      : decodedRoute.length - 1;
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (midIdx === startIdx && endIdx > startIdx) {
      // Edge spans only 1 segment — interpolate between start and end
      const s = decodedRoute[startIdx];
      const e = decodedRoute[endIdx];
      return [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
    }
    return decodedRoute[midIdx];
  });

  return { requestUrl, response: data, decodedRoute, edgeBreakPoints, edgeMidPoints, edgeInfoList };
}
