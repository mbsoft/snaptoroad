'use client';

import { useState, useCallback } from 'react';

interface JsonTreeProps {
  data: unknown;
  defaultExpanded?: number;
}

export default function JsonTree({ data, defaultExpanded = 1 }: JsonTreeProps) {
  return (
    <div className="json-tree">
      <JsonNode value={data} depth={0} defaultExpanded={defaultExpanded} />
    </div>
  );
}

function JsonNode({
  name,
  value,
  depth,
  defaultExpanded,
  isLast = true,
}: {
  name?: string;
  value: unknown;
  depth: number;
  defaultExpanded: number;
  isLast?: boolean;
}) {
  const isExpandable =
    value !== null && typeof value === 'object';
  const [expanded, setExpanded] = useState(depth < defaultExpanded);

  const toggle = useCallback(() => setExpanded((e) => !e), []);

  if (!isExpandable) {
    return (
      <div className="jt-line">
        {name !== undefined && (
          <span className="jt-key">&quot;{name}&quot;: </span>
        )}
        <Primitive value={value} />
        {!isLast && <span className="jt-punct">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [i, v] as const)
    : Object.entries(value as Record<string, unknown>);
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';
  const count = entries.length;

  if (!expanded) {
    return (
      <div className="jt-line">
        <button className="jt-toggle" onClick={toggle} aria-label="Expand">
          <span className="jt-arrow">&#9654;</span>
        </button>
        {name !== undefined && (
          <span className="jt-key">&quot;{name}&quot;: </span>
        )}
        <span className="jt-punct">{open}</span>
        <span className="jt-collapsed" onClick={toggle}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
        <span className="jt-punct">{close}</span>
        {!isLast && <span className="jt-punct">,</span>}
      </div>
    );
  }

  return (
    <div className="jt-node">
      <div className="jt-line">
        <button className="jt-toggle" onClick={toggle} aria-label="Collapse">
          <span className="jt-arrow jt-arrow-down">&#9654;</span>
        </button>
        {name !== undefined && (
          <span className="jt-key">&quot;{name}&quot;: </span>
        )}
        <span className="jt-punct">{open}</span>
      </div>
      <div className="jt-children">
        {entries.map(([k, v], i) => (
          <JsonNode
            key={String(k)}
            name={isArray ? undefined : String(k)}
            value={v}
            depth={depth + 1}
            defaultExpanded={defaultExpanded}
            isLast={i === entries.length - 1}
          />
        ))}
      </div>
      <div className="jt-line">
        <span className="jt-punct">{close}</span>
        {!isLast && <span className="jt-punct">,</span>}
      </div>
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="jt-null">null</span>;
  if (value === undefined) return <span className="jt-null">undefined</span>;
  if (typeof value === 'boolean')
    return <span className="jt-bool">{String(value)}</span>;
  if (typeof value === 'number')
    return <span className="jt-num">{String(value)}</span>;
  if (typeof value === 'string') {
    const truncated = value.length > 120;
    const display = truncated ? value.slice(0, 120) + '...' : value;
    return (
      <span className="jt-str" title={truncated ? value : undefined}>
        &quot;{display}&quot;
      </span>
    );
  }
  return <span className="jt-str">{String(value)}</span>;
}
