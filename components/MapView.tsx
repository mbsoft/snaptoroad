'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPoint } from '@/lib/types';

const ROUTE_SOURCE = 'snapped-route';
const ROUTE_LAYER = 'snapped-route-line';
const EDGE_BREAKS_SOURCE = 'edge-breaks';
const EDGE_BREAKS_LAYER = 'edge-breaks-dots';
const SELECTED_EDGE_SOURCE = 'selected-edge';
const SELECTED_EDGE_LAYER = 'selected-edge-dot';

interface MapViewProps {
  apiKey: string;
  points: MapPoint[];
  snappedRoute: [number, number][] | null;
  edgeBreakPoints: [number, number][] | null;
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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.nextbillion.io/orbis/style/0.4.4-0/style.json?apiVersion=1&&map=basic_street-light&key=${apiKey}`,
      center: [-118.2437, 34.0522],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapLoadedRef.current = true;
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      // Ignore right-clicks (handled by contextmenu)
      if (e.originalEvent.button !== 0) return;
      // Check if click hit an edge break dot
      if (map.getLayer(EDGE_BREAKS_LAYER)) {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [EDGE_BREAKS_LAYER],
        });
        if (features.length > 0) {
          const edgeIdx = features[0].properties?.edgeIndex;
          if (edgeIdx !== undefined) {
            onEdgeSelectRef.current(edgeIdx);
          }
          return;
        }
      }
      onEdgeSelectRef.current(null);
      onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    // Right-click to inspect edge info
    map.on('contextmenu', (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();

      // Check if right-click hit an edge dot directly
      if (map.getLayer(EDGE_BREAKS_LAYER)) {
        const dotFeatures = map.queryRenderedFeatures(e.point, {
          layers: [EDGE_BREAKS_LAYER],
        });
        if (dotFeatures.length > 0) {
          const edgeIdx = dotFeatures[0].properties?.edgeIndex;
          if (edgeIdx !== undefined) {
            onEdgeSelectRef.current(edgeIdx);
          }
          return;
        }
      }

      // Check if right-click hit the route line, find nearest edge dot
      if (map.getLayer(ROUTE_LAYER) && map.getLayer(EDGE_BREAKS_LAYER)) {
        const routeFeatures = map.queryRenderedFeatures(e.point, {
          layers: [ROUTE_LAYER],
        });
        if (routeFeatures.length > 0) {
          // Query all edge dots within a wider radius and pick the closest
          const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
            [e.point.x - 50, e.point.y - 50],
            [e.point.x + 50, e.point.y + 50],
          ];
          const nearbyDots = map.queryRenderedFeatures(bbox, {
            layers: [EDGE_BREAKS_LAYER],
          });
          if (nearbyDots.length > 0) {
            // Find closest dot by screen distance
            let closest = nearbyDots[0];
            let minDist = Infinity;
            for (const f of nearbyDots) {
              const coords = (f.geometry as GeoJSON.Point).coordinates;
              const projected = map.project([coords[0], coords[1]]);
              const dx = projected.x - e.point.x;
              const dy = projected.y - e.point.y;
              const dist = dx * dx + dy * dy;
              if (dist < minDist) {
                minDist = dist;
                closest = f;
              }
            }
            const edgeIdx = closest.properties?.edgeIndex;
            if (edgeIdx !== undefined) {
              onEdgeSelectRef.current(edgeIdx);
            }
            return;
          }
        }
      }
    });

    // Pointer cursor on hover over edge dots
    map.on('mouseenter', EDGE_BREAKS_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', EDGE_BREAKS_LAYER, () => {
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
