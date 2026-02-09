'use client';

import { MapPoint, EdgeInfo } from '@/lib/types';

interface PointsPanelProps {
  points: MapPoint[];
  onClear: () => void;
  onRemovePoint: (id: number) => void;
  selectedEdge: EdgeInfo | null;
  selectedEdgeIndex: number | null;
  onEdgeDismiss: () => void;
}

export default function PointsPanel({
  points,
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
          points.map((point) => (
            <div key={point.id} className="point-card">
              <div className="point-badge">{point.label}</div>
              <div className="point-coords">
                <span>Lat: {point.lat.toFixed(6)}</span>
                <span>Lng: {point.lng.toFixed(6)}</span>
              </div>
              <button
                className="point-remove"
                onClick={() => onRemovePoint(point.id)}
                title="Remove point"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
      {selectedEdge && (
        <div className="edge-info-section">
          <div className="edge-info-header">
            <h3>
              Edge #{selectedEdgeIndex !== null ? selectedEdgeIndex : ''}
              <span className="badge">offset {String(selectedEdge.offset ?? '')}</span>
            </h3>
            <button onClick={onEdgeDismiss}>&times;</button>
          </div>
          <div className="edge-info-body">
            <EdgeDetails data={selectedEdge} />
          </div>
        </div>
      )}
    </div>
  );
}

function EdgeDetails({ data }: { data: EdgeInfo }) {
  const entries = Object.entries(data);

  return (
    <div className="edge-details">
      {entries.map(([key, value]) => (
        <EdgeField key={key} label={key} value={value} />
      ))}
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
