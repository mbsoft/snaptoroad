export type RequestType = 'snap2road' | 'directions' | 'navigation';

export const API_ENDPOINTS = [
  { value: 'https://api.nextbillion.io', label: 'api.nextbillion.io' },
  { value: 'http://localhost:9008', label: 'localhost:9008' },
] as const;

export type ApiEndpoint = typeof API_ENDPOINTS[number]['value'];

export interface SnappedPointInfo {
  name?: string;
  bearing?: number;
  distance?: number;
}

export interface ApiResult {
  requestUrl: string;
  response: object;
  decodedRoute: [number, number][];
  edgeBreakPoints: [number, number][];
  edgeOffsets: number[];
  edgeMidPoints: [number, number][];
  edgeInfoList: EdgeInfo[];
  snappedPointsByIndex?: Map<number, SnappedPointInfo>;
  navigationLegs?: NavigationLeg[];
}

export interface MapPoint {
  id: number;
  label: string;
  lat: number;
  lng: number;
}

export type EdgeInfo = Record<string, unknown>;

export interface NavigationManeuver {
  instruction?: string;
  maneuver_type?: string;
  modifier?: string;
  bearing_before?: number;
  bearing_after?: number;
  location?: [number, number];
}

export interface NavigationStep {
  geometry?: string;
  start_location?: [number, number];
  end_location?: [number, number];
  distance?: { value: number };
  duration?: { value: number };
  maneuver?: NavigationManeuver;
  name?: string;
  driving_side?: string;
  intersections?: unknown[];
}

export interface NavigationLeg {
  distance?: { value: number };
  duration?: { value: number };
  start_location?: [number, number];
  end_location?: [number, number];
  steps: NavigationStep[];
}

export interface SnapToRoadResponse {
  status: string;
  msg?: string;
  geometry?: string[];
  snappedPoints?: Array<{
    location: { latitude: number; longitude: number };
    originalIndex?: number;
    distance?: number;
    name?: string;
    bearing?: number;
  }>;
  distance?: number;
  road_info?: unknown[];
  snap_node_info?: unknown[];
  debug_info?: unknown[];
  [key: string]: unknown;
}

