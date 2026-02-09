export interface MapPoint {
  id: number;
  label: string;
  lat: number;
  lng: number;
}

export type EdgeInfo = Record<string, unknown>;

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

