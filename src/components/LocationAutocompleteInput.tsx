import React, { useEffect, useRef, useState } from 'react';
import { searchPlaces, type PlaceSuggestion } from '../lib/locationSearchService';
import './LocationAutocompleteInput.css';

interface LocationAutocompleteInputProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: PlaceSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
}

const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  inputClassName,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(value, controller.signal)
        .then((hits) => setSuggestions(hits))
        .catch(() => {
          // aborted (user kept typing) or Nominatim hiccup — keep last known list
        });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="loc-autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <ul className="loc-autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              className="loc-autocomplete-item"
              onClick={() => { onSelect(s); setOpen(false); }}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocompleteInput;
