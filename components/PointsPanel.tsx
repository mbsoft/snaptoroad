'use client';

import { useState } from 'react';
import { MapPoint, EdgeInfo, NavigationLeg, NavigationStep, SnappedPointInfo } from '@/lib/types';

interface PointsPanelProps {
  points: MapPoint[];
  snappedPointsMap: Map<number, SnappedPointInfo>;
  navigationLegs: NavigationLeg[];
  onClear: () => void;
  onRemovePoint: (id: number) => void;
  selectedEdge: EdgeInfo | null;
  selectedEdgeIndex: number | null;
  onEdgeDismiss: () => void;
}

export default function PointsPanel({
  points,
  snappedPointsMap,
  navigationLegs,
  onClear,
  onRemovePoint,
  selectedEdge,
  selectedEdgeIndex,
  onEdgeDismiss,
}: PointsPanelProps) {
  return (
    <div className="points-panel">
      <div className="points-panel-header">
        <h3>
          Points
          {points.length > 0 && <span className="badge">{points.length}</span>}
        </h3>
        {points.length > 0 && <button onClick={onClear}>Clear All</button>}
      </div>
      <div className="points-list">
        {points.length === 0 ? (
          <div className="empty-msg">Click on the map to add points</div>
        ) : (
          points.map((point, idx) => {
            const snap = snappedPointsMap.get(idx);
            return (
              <div key={point.id} className="point-card">
                <div className="point-badge">{point.label}</div>
                <div className="point-coords">
                  <span>Lat: {point.lat.toFixed(6)}</span>
                  <span>Lng: {point.lng.toFixed(6)}</span>
                  {snap?.name && <span className="snap-detail">Name: {snap.name}</span>}
                  {snap?.distance !== undefined && <span className="snap-detail">Distance: {snap.distance}m</span>}
                  {snap?.bearing !== undefined && <span className="snap-detail">Bearing: {snap.bearing}&deg;</span>}
                </div>
                <button
                  className="point-remove"
                  onClick={() => onRemovePoint(point.id)}
                  title="Remove point"
                >
                  &times;
                </button>
              </div>
            );
          })
        )}
        {navigationLegs.length > 0 && (
          <NavigationLegsPanel legs={navigationLegs} />
        )}
        {selectedEdge && (
          <div className="edge-info-section">
            <div className="edge-info-header">
              <h3>
                Edge #{selectedEdgeIndex !== null ? selectedEdgeIndex : ''}
                <span className="badge">offset {String(selectedEdge.offset ?? '')}</span>
              </h3>
              <button type="button" onClick={onEdgeDismiss}>&times;</button>
            </div>
            <div className="edge-info-body">
              <EdgeDetails data={selectedEdge} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const DISPLAY_FIELDS: [string, string][] = [
  ['way_id', 'Way Id'],
  ['raw_speed', 'Raw Speed'],
  ['speed_limit', 'Speed Limit'],
  ['edge_id', 'Edge Id'],
  ['speed_sources', 'Speed Sources'],
];

function EdgeDetails({ data }: { data: EdgeInfo }) {
  return (
    <div className="edge-details">
      {DISPLAY_FIELDS.map(([key, label]) => {
        const value = data[key];
        if (value === undefined) return null;
        return <EdgeField key={key} label={label} value={value} />;
      })}
    </div>
  );
}

function EdgeField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) {
    return (
      <div className="edge-field">
        <span className="edge-field-label">{formatLabel(label)}</span>
        <span className="edge-field-value edge-field-null">null</span>
      </div>
    );
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    return (
      <div className="edge-field-group">
        <span className="edge-field-group-label">{formatLabel(label)}</span>
        <div className="edge-field-group-body">
          {entries.map(([k, v]) => (
            <EdgeField key={k} label={k} value={v} />
          ))}
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="edge-field">
          <span className="edge-field-label">{formatLabel(label)}</span>
          <span className="edge-field-value edge-field-null">[]</span>
        </div>
      );
    }
    return (
      <div className="edge-field-group">
        <span className="edge-field-group-label">{formatLabel(label)} [{value.length}]</span>
        <div className="edge-field-group-body">
          {value.map((v, i) => (
            <EdgeField key={i} label={String(i)} value={v} />
          ))}
        </div>
      </div>
    );
  }

  const isBoolean = typeof value === 'boolean';
  const isNumber = typeof value === 'number';

  return (
    <div className="edge-field">
      <span className="edge-field-label">{formatLabel(label)}</span>
      <span
        className={`edge-field-value ${
          isBoolean ? 'edge-field-bool' : isNumber ? 'edge-field-num' : ''
        }`}
      >
        {String(value)}
      </span>
    </div>
  );
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ');
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${Math.round(seconds)}s`;
}

function NavigationLegsPanel({ legs }: { legs: NavigationLeg[] }) {
  const totalDistance = legs.reduce((sum, l) => sum + (l.distance?.value ?? 0), 0);
  const totalDuration = legs.reduce((sum, l) => sum + (l.duration?.value ?? 0), 0);

  return (
    <div className="nav-legs-section">
      <div className="nav-legs-header">
        <h3>
          Route Details —{' '}
          <span className="badge">{legs.length} leg{legs.length !== 1 ? 's' : ''}</span>
        </h3>
        <span className="nav-legs-summary">
          {formatDistance(totalDistance)} &middot; {formatDuration(totalDuration)}
        </span>
      </div>
      <div className="nav-legs-body">
        {legs.map((leg, legIdx) => (
          <LegCard key={legIdx} leg={leg} index={legIdx} totalLegs={legs.length} />
        ))}
      </div>
    </div>
  );
}

function LegCard({ leg, index, totalLegs }: { leg: NavigationLeg; index: number; totalLegs: number }) {
  const [expanded, setExpanded] = useState(true);
  const stepCount = leg.steps.length;

  return (
    <div className="nav-leg-card">
      <button type="button" className="nav-leg-toggle" onClick={() => setExpanded(!expanded)}>
        <span className="nav-leg-arrow">{expanded ? '▾' : '▸'}</span>
        <span className="nav-leg-title">
          {totalLegs > 1 ? `Leg ${index + 1}` : 'Route'}
        </span>
        <span className="nav-leg-meta">
          {leg.distance?.value !== undefined && formatDistance(leg.distance.value)}
          {leg.duration?.value !== undefined && ` · ${formatDuration(leg.duration.value)}`}
        </span>
        <span className="badge">{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
      </button>
      {expanded && (
        <div className="nav-leg-steps">
          {leg.steps.map((step, stepIdx) => (
            <StepCard key={stepIdx} step={step} index={stepIdx} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepCard({ step, index }: { step: NavigationStep; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="nav-step-card">
      <div className="nav-step-main" onClick={() => setExpanded(!expanded)}>
        <span className="nav-step-index">{index + 1}</span>
        <div className="nav-step-info">
          <span className="nav-step-instruction">
            {step.maneuver?.instruction || step.name || 'Continue'}
          </span>
          <span className="nav-step-meta">
            {step.distance?.value !== undefined && formatDistance(step.distance.value)}
            {step.duration?.value !== undefined && ` · ${formatDuration(step.duration.value)}`}
            {step.name && step.maneuver?.instruction && (
              <span className="nav-step-road"> — {step.name}</span>
            )}
          </span>
        </div>
        <span className="nav-step-expand">{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div className="nav-step-details">
          {step.maneuver && (
            <div className="nav-step-group">
              <span className="nav-step-group-label">Maneuver</span>
              {step.maneuver.maneuver_type && (
                <div className="nav-step-field">
                  <span className="nav-step-field-label">Type</span>
                  <span className="nav-step-field-value">{step.maneuver.maneuver_type}</span>
                </div>
              )}
              {step.maneuver.modifier && (
                <div className="nav-step-field">
                  <span className="nav-step-field-label">Modifier</span>
                  <span className="nav-step-field-value">{step.maneuver.modifier}</span>
                </div>
              )}
              {step.maneuver.bearing_before !== undefined && (
                <div className="nav-step-field">
                  <span className="nav-step-field-label">Bearing Before</span>
                  <span className="nav-step-field-value">{step.maneuver.bearing_before}&deg;</span>
                </div>
              )}
              {step.maneuver.bearing_after !== undefined && (
                <div className="nav-step-field">
                  <span className="nav-step-field-label">Bearing After</span>
                  <span className="nav-step-field-value">{step.maneuver.bearing_after}&deg;</span>
                </div>
              )}
              {step.maneuver.location && (
                <div className="nav-step-field">
                  <span className="nav-step-field-label">Location</span>
                  <span className="nav-step-field-value">{step.maneuver.location[1].toFixed(6)}, {step.maneuver.location[0].toFixed(6)}</span>
                </div>
              )}
            </div>
          )}
          {step.driving_side && (
            <div className="nav-step-field">
              <span className="nav-step-field-label">Driving Side</span>
              <span className="nav-step-field-value">{step.driving_side}</span>
            </div>
          )}
          {step.intersections && step.intersections.length > 0 && (
            <div className="nav-step-group">
              <span className="nav-step-group-label">Intersections ({step.intersections.length})</span>
              {step.intersections.map((inter, i) => (
                <IntersectionDetail key={i} data={inter} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntersectionDetail({ data, index }: { data: unknown; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const obj = data as Record<string, unknown>;

  return (
    <div className="nav-intersection">
      <button type="button" className="nav-intersection-toggle" onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? '▾' : '▸'} Intersection {index + 1}</span>
        {Array.isArray(obj.location) && (
          <span className="nav-step-field-value">
            {(obj.location[1] as number).toFixed(6)}, {(obj.location[0] as number).toFixed(6)}
          </span>
        )}
      </button>
      {expanded && (
        <div className="nav-intersection-body">
          {Object.entries(obj).map(([key, value]) => {
            if (key === 'location' && Array.isArray(value)) {
              return (
                <div key={key} className="nav-step-field">
                  <span className="nav-step-field-label">Location</span>
                  <span className="nav-step-field-value">{(value[1] as number).toFixed(6)}, {(value[0] as number).toFixed(6)}</span>
                </div>
              );
            }
            if (Array.isArray(value)) {
              return (
                <div key={key} className="nav-step-field">
                  <span className="nav-step-field-label">{formatLabel(key)}</span>
                  <span className="nav-step-field-value">[{value.join(', ')}]</span>
                </div>
              );
            }
            return (
              <div key={key} className="nav-step-field">
                <span className="nav-step-field-label">{formatLabel(key)}</span>
                <span className="nav-step-field-value">{String(value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
