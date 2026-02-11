'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPoint } from '@/lib/types';

const PRIMARY_STYLE = (key: string) =>
  `https://api.nextbillion.io/orbis/style/0.4.4-0/style.json?apiVersion=1&&map=basic_street-light&key=${key}`;
const FALLBACK_STYLE = (key: string) =>
  `https://api.nextbillion.io/maps/streets/style.json?key=${key}`;

const ROUTE_SOURCE = 'snapped-route';
const ROUTE_LAYER = 'snapped-route-line';
const EDGE_SEGMENTS_SOURCE = 'edge-segments';
const EDGE_SEGMENTS_LAYER = 'edge-segments-hit';
const EDGE_BREAKS_SOURCE = 'edge-breaks';
const EDGE_BREAKS_LAYER = 'edge-breaks-dots';
const SELECTED_EDGE_SOURCE = 'selected-edge';
const SELECTED_EDGE_LAYER = 'selected-edge-dot';

interface MapViewProps {
  apiKey: string;
  points: MapPoint[];
  snappedRoute: [number, number][] | null;
  edgeBreakPoints: [number, number][] | null;
  edgeOffsets: number[];
  edgeMidPoints: [number, number][];
  selectedEdgeIndex: number | null;
  onMapClick: (lat: number, lng: number) => void;
  onEdgeSelect: (index: number | null) => void;
  onPointMove: (id: number, lat: number, lng: number) => void;
}

export default function MapView({
  apiKey,
  points,
  snappedRoute,
  edgeBreakPoints,
  edgeOffsets,
  edgeMidPoints,
  selectedEdgeIndex,
  onMapClick,
  onEdgeSelect,
  onPointMove,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const mapLoadedRef = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  const onEdgeSelectRef = useRef(onEdgeSelect);
  const onPointMoveRef = useRef(onPointMove);

  // Keep callback refs current
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onEdgeSelectRef.current = onEdgeSelect;
  }, [onEdgeSelect]);

  useEffect(() => {
    onPointMoveRef.current = onPointMove;
  }, [onPointMove]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let usedFallback = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: PRIMARY_STYLE(apiKey),
      center: [-87.6298, 41.8781],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapLoadedRef.current = true;
    });

    // Switch to fallback style if tile loading errors occur
    map.on('error', (e) => {
      if (!usedFallback && e.error?.status >= 400) {
        usedFallback = true;
        map.setStyle(FALLBACK_STYLE(apiKey));
      }
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (e.originalEvent.button !== 0) return;
      onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    // Hover on edge segments to show details
    map.on('mousemove', EDGE_SEGMENTS_LAYER, (e) => {
      if (e.features && e.features.length > 0) {
        const edgeIdx = e.features[0].properties?.edgeIndex;
        if (edgeIdx !== undefined) {
          onEdgeSelectRef.current(edgeIdx);
          map.getCanvas().style.cursor = 'pointer';
        }
      }
    });

    map.on('mouseleave', EDGE_SEGMENTS_LAYER, () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [apiKey]);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(points.map((p) => p.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    points.forEach((point) => {
      const existing = markersRef.current.get(point.id);
      if (existing) {
        // Update label text in case of reindex
        const el = existing.getElement();
        if (el.textContent !== point.label) {
          el.textContent = point.label;
        }
      } else {
        const el = document.createElement('div');
        el.className = 'marker-label';
        el.textContent = point.label;

        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat([point.lng, point.lat])
          .addTo(map);

        const pointId = point.id;
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onPointMoveRef.current(pointId, lngLat.lat, lngLat.lng);
        });

        markersRef.current.set(point.id, marker);
      }
    });
  }, [points]);

  // Render snapped route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function updateRoute() {
      if (map!.getLayer(ROUTE_LAYER)) {
        map!.removeLayer(ROUTE_LAYER);
      }
      if (map!.getSource(ROUTE_SOURCE)) {
        map!.removeSource(ROUTE_SOURCE);
      }

      if (!snappedRoute || snappedRoute.length === 0) return;

      // polyline.decode returns [lat, lng]; GeoJSON needs [lng, lat]
      const coordinates = snappedRoute.map(([lat, lng]) => [lng, lat]);

      map!.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      map!.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        paint: {
          'line-color': '#e74c3c',
          'line-width': 4,
          'line-opacity': 0.85,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    }

    if (mapLoadedRef.current) {
      updateRoute();
    } else {
      map.on('load', updateRoute);
    }
  }, [snappedRoute]);

  // Render per-edge segments (invisible wide hit area for hover detection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function update() {
      if (map!.getLayer(EDGE_SEGMENTS_LAYER)) {
        map!.removeLayer(EDGE_SEGMENTS_LAYER);
      }
      if (map!.getSource(EDGE_SEGMENTS_SOURCE)) {
        map!.removeSource(EDGE_SEGMENTS_SOURCE);
      }

      if (!snappedRoute || snappedRoute.length === 0 || edgeOffsets.length === 0) return;

      const features = edgeOffsets.map((startIdx, i) => {
        const endIdx = i + 1 < edgeOffsets.length
          ? edgeOffsets[i + 1]
          : snappedRoute.length - 1;
        // Slice the route from this edge's start to the next edge's start (inclusive)
        const coords = snappedRoute
          .slice(startIdx, endIdx + 1)
          .map(([lat, lng]) => [lng, lat]);

        return {
          type: 'Feature' as const,
          properties: { edgeIndex: i },
          geometry: {
            type: 'LineString' as const,
            coordinates: coords,
          },
        };
      });

      map!.addSource(EDGE_SEGMENTS_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      // Transparent wide line for easy hover hit detection
      map!.addLayer({
        id: EDGE_SEGMENTS_LAYER,
        type: 'line',
        source: EDGE_SEGMENTS_SOURCE,
        paint: {
          'line-color': 'transparent',
          'line-width': 16,
        },
      });
    }

    if (mapLoadedRef.current) {
      update();
    } else {
      map.on('load', update);
    }
  }, [snappedRoute, edgeOffsets]);

  // Render edge break point dots (black boundary dots)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function update() {
      if (map!.getLayer(EDGE_BREAKS_LAYER)) {
        map!.removeLayer(EDGE_BREAKS_LAYER);
      }
      if (map!.getSource(EDGE_BREAKS_SOURCE)) {
        map!.removeSource(EDGE_BREAKS_SOURCE);
      }

      if (!edgeBreakPoints || edgeBreakPoints.length === 0) return;

      const features = edgeBreakPoints.map(([lat, lng], i) => ({
        type: 'Feature' as const,
        properties: { edgeIndex: i },
        geometry: {
          type: 'Point' as const,
          coordinates: [lng, lat],
        },
      }));

      map!.addSource(EDGE_BREAKS_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      map!.addLayer({
        id: EDGE_BREAKS_LAYER,
        type: 'circle',
        source: EDGE_BREAKS_SOURCE,
        paint: {
          'circle-radius': 3,
          'circle-color': '#000000',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      });
    }

    if (mapLoadedRef.current) {
      update();
    } else {
      map.on('load', update);
    }
  }, [edgeBreakPoints]);

  // Render selected edge midpoint (orange marker)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function update() {
      if (map!.getLayer(SELECTED_EDGE_LAYER)) {
        map!.removeLayer(SELECTED_EDGE_LAYER);
      }
      if (map!.getSource(SELECTED_EDGE_SOURCE)) {
        map!.removeSource(SELECTED_EDGE_SOURCE);
      }

      if (selectedEdgeIndex === null || !edgeMidPoints[selectedEdgeIndex]) return;

      const [lat, lng] = edgeMidPoints[selectedEdgeIndex];

      map!.addSource(SELECTED_EDGE_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      });

      map!.addLayer({
        id: SELECTED_EDGE_LAYER,
        type: 'circle',
        source: SELECTED_EDGE_SOURCE,
        paint: {
          'circle-radius': 7,
          'circle-color': '#ff6600',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }

    if (mapLoadedRef.current) {
      update();
    } else {
      map.on('load', update);
    }
  }, [selectedEdgeIndex, edgeMidPoints]);

  return (
    <div className="map-wrapper">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
