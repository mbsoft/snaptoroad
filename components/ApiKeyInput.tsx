'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'nbai_api_key';

interface ApiKeyInputProps {
  onSubmit: (key: string) => void;
}

export default function ApiKeyInput({ onSubmit }: ApiKeyInputProps) {
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
      <label>NB.AI API Key</label>
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
    </div>
  );
}
