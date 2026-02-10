'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import JsonTree from './JsonTree';

type Tab = 'request' | 'response';

interface JsonResponsePanelProps {
  requestUrl: string | null;
  response: object | null;
  isLoading: boolean;
  error: string | null;
}

export default function JsonResponsePanel({
  requestUrl,
  response,
  isLoading,
  error,
}: JsonResponsePanelProps) {
  const [expandDepth, setExpandDepth] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('response');
  const [panelHeight, setPanelHeight] = useState(250);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
  }, [panelHeight]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.max(80, Math.min(startHeightRef.current + delta, window.innerHeight - 200));
      setPanelHeight(newHeight);
    }
    function onMouseUp() {
      draggingRef.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleCopy() {
    if (activeTab === 'response' && response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    } else if (activeTab === 'request' && requestUrl) {
      navigator.clipboard.writeText(requestUrl);
    }
  }

  // Parse request URL into method, base URL, and params for display
  function parseRequestUrl(url: string) {
    try {
      const parsed = new URL(url);
      const params: [string, string][] = [];
      parsed.searchParams.forEach((value, key) => {
        params.push([key, value]);
      });
      return { base: `${parsed.origin}${parsed.pathname}`, params };
    } catch {
      return { base: url, params: [] };
    }
  }

  return (
    <div className="json-panel" style={{ height: panelHeight, maxHeight: 'none' }}>
      <div className="json-panel-resize" onMouseDown={handleMouseDown} />
      <div className="json-panel-header">
        <div className="json-panel-tabs">
          <button
            className={`json-panel-tab ${activeTab === 'request' ? 'active' : ''}`}
            onClick={() => setActiveTab('request')}
          >
            Request
          </button>
          <button
            className={`json-panel-tab ${activeTab === 'response' ? 'active' : ''}`}
            onClick={() => setActiveTab('response')}
          >
            Response
          </button>
        </div>
        <div className="json-panel-actions">
          {activeTab === 'response' && response && (
            <>
              <button onClick={() => setExpandDepth(0)}>Collapse All</button>
              <button onClick={() => setExpandDepth((d) => d === 1 ? 1.1 : 1)}>
                Level 1
              </button>
              <button onClick={() => setExpandDepth((d) => d === 2 ? 2.1 : 2)}>
                Level 2
              </button>
              <button onClick={() => setExpandDepth(100)}>Expand All</button>
            </>
          )}
          {((activeTab === 'response' && response) || (activeTab === 'request' && requestUrl)) && (
            <button onClick={handleCopy}>Copy</button>
          )}
        </div>
      </div>
      <div className="json-panel-body">
        {activeTab === 'request' ? (
          requestUrl ? (
            <div className="request-display">
              <div className="request-method">GET</div>
              {(() => {
                const { base, params } = parseRequestUrl(requestUrl);
                return (
                  <>
                    <div className="request-url">{base}</div>
                    {params.length > 0 && (
                      <div className="request-params">
                        <div className="request-params-title">Parameters</div>
                        {params.map(([key, value], i) => (
                          <div key={i} className="request-param">
                            <span className="request-param-key">{key}</span>
                            <span className="request-param-value">
                              {key === 'key' ? value.substring(0, 8) + '...' : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="empty-msg">
              Request will appear here after adding 2+ points
            </div>
          )
        ) : isLoading ? (
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
