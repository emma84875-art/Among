import { useState, useMemo } from 'react';
import { COUNTRIES, CountryInfo } from '../../utils/countries';
import { IconSearch, IconClose, IconCheck, IconChevronDown } from '../common/Icons';

interface CountryCodePickerProps {
  selectedCountry: CountryInfo;
  onSelect: (country: CountryInfo) => void;
  disabled?: boolean;
}

export function CountryCodePicker({
  selectedCountry,
  onSelect,
  disabled = false,
}: CountryCodePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
      <button
        type="button"
        id="country-code-selector-trigger"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex items-center gap-2 h-12 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm font-medium hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        <span className="text-base leading-none select-none">{selectedCountry.flag}</span>
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
          {selectedCountry.dialCode}
        </span>
        <IconChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          id="country-picker-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
        >
          <div
            id="country-picker-modal-content"
            className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-picker-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3
                  id="country-picker-title"
                  className="text-sm font-semibold text-zinc-950 dark:text-zinc-50"
                >
                  Select Country & Region
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose international dialing code
                </p>
              </div>
              <button
                type="button"
                id="close-country-picker-btn"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                aria-label="Close country selector"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative flex items-center">
                <IconSearch className="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  id="country-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  autoFocus
                  className="w-full h-10 pl-9 pr-3 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredCountries.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No matching countries found.
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = country.code === selectedCountry.code;
                  return (
                    <button
                      key={country.code}
                      id={`country-option-${country.code.toLowerCase()}`}
                      type="button"
                      onClick={() => {
                        onSelect(country);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-medium'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base select-none leading-none">{country.flag}</span>
                        <span className="truncate">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-zinc-500 dark:text-zinc-400">
                        <span>{country.dialCode}</span>
                        {isSelected && (
                          <IconCheck className="w-3.5 h-3.5 text-zinc-950 dark:text-zinc-100" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
