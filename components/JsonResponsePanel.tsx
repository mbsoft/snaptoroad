'use client';

import { useState } from 'react';
import JsonTree from './JsonTree';

interface JsonResponsePanelProps {
  response: object | null;
  isLoading: boolean;
  error: string | null;
}

export default function JsonResponsePanel({
  response,
  isLoading,
  error,
}: JsonResponsePanelProps) {
  const [expandDepth, setExpandDepth] = useState(1);

  function handleCopy() {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    }
  }

  return (
    <div className="json-panel">
      <div className="json-panel-header">
        <h3>API Response</h3>
        {response && (
          <div className="json-panel-actions">
            <button onClick={() => setExpandDepth(0)}>Collapse All</button>
            <button onClick={() => setExpandDepth((d) => d === 1 ? 1.1 : 1)}>
              Level 1
            </button>
            <button onClick={() => setExpandDepth((d) => d === 2 ? 2.1 : 2)}>
              Level 2
            </button>
            <button onClick={() => setExpandDepth(100)}>Expand All</button>
            <button onClick={handleCopy}>Copy</button>
          </div>
        )}
      </div>
      <div className="json-panel-body">
        {isLoading ? (
          <div className="loading-msg">Calling snap-to-road API...</div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : response ? (
          <JsonTree
            key={Math.floor(expandDepth * 10)}
            data={response}
            defaultExpanded={Math.floor(expandDepth)}
          />
        ) : (
          <div className="empty-msg">
            Response will appear here after adding 2+ points
          </div>
        )}
      </div>
    </div>
  );
}
