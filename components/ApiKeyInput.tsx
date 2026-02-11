'use client';

import { useState, useEffect } from 'react';
import { RequestType, ApiEndpoint, API_ENDPOINTS } from '@/lib/types';

const STORAGE_KEY = 'nbai_api_key';

interface ApiKeyInputProps {
  onSubmit: (key: string) => void;
  requestType: RequestType;
  onRequestTypeChange: (type: RequestType) => void;
  endpoint: ApiEndpoint;
  onEndpointChange: (endpoint: ApiEndpoint) => void;
  debug: boolean;
  onDebugChange: (debug: boolean) => void;
}

export default function ApiKeyInput({ onSubmit, requestType, onRequestTypeChange, endpoint, onEndpointChange, debug, onDebugChange }: ApiKeyInputProps) {
  const [value, setValue] = useState('');
  const [isSet, setIsSet] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setValue(cached);
      setIsSet(true);
      onSubmit(cached);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSet() {
    const trimmed = value.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setIsSet(true);
    onSubmit(trimmed);
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY);
    setValue('');
    setIsSet(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSet();
  }

  return (
    <div className="api-key-bar">
      <label>API Key</label>
      <input
        type="password"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setIsSet(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Enter your NextBillion.ai API key"
      />
      <button className="btn-set" onClick={handleSet}>
        Set Key
      </button>
      {value && (
        <button className="btn-clear" onClick={handleClear}>
          Clear
        </button>
      )}
      {isSet && <span className="status">Key set</span>}
      <select
        value={endpoint}
        onChange={(e) => onEndpointChange(e.target.value as ApiEndpoint)}
        title="API endpoint"
      >
        {API_ENDPOINTS.map((ep) => (
          <option key={ep.value} value={ep.value}>{ep.label}</option>
        ))}
      </select>
      <select
        value={requestType}
        onChange={(e) => onRequestTypeChange(e.target.value as RequestType)}
        title="Request type"
      >
        <option value="directions">Directions</option>
        <option value="snap2road">Snap to Road</option>
        <option value="navigation">Navigation</option>
      </select>
      <label className="debug-checkbox">
        <input
          type="checkbox"
          checked={debug}
          onChange={(e) => onDebugChange(e.target.checked)}
        />
        Debug
      </label>
    </div>
  );
}
