import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Boxes, Check } from 'lucide-react';
import { Product } from '../types';

export interface SearchableProductSelectProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  selectedCategory?: string;
  placeholder?: string;
  className?: string;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products = [],
  selectedProductId,
  onSelectProduct,
  selectedCategory,
  placeholder = 'Search item by name or code...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Safely find selected product
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId || p.mcode === selectedProductId);
  }, [products, selectedProductId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Autofocus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter products based on category and search query
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory && selectedCategory.trim()) {
      const catLower = selectedCategory.trim().toLowerCase();
      list = list.filter((p) => (p.category || '').toLowerCase() === catLower);
    }

    if (!searchTerm.trim()) {
      return list;
    }

    const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const mcode = String(p.mcode || '').toLowerCase();
      const sku = String(p.sku || '').toLowerCase();
      const cat = String(p.category || '').toLowerCase();
      const combined = `${mcode} ${sku} ${name} ${cat}`;
      return tokens.every((token) => combined.includes(token));
    });
  }, [products, selectedCategory, searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    // items include option 0: "All Stock / Items", then filteredProducts
    const totalOptions = filteredProducts.length + 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % totalOptions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        onSelectProduct('');
      } else {
        const chosen = filteredProducts[highlightedIndex - 1];
        if (chosen) onSelectProduct(chosen.id);
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (productId: string) => {
    onSelectProduct(productId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProduct('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 bg-slate-950 border border-indigo-500/60 hover:border-indigo-400 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs text-left transition cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Boxes className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {selectedProduct ? (
            <div className="flex items-center gap-1.5 truncate">
              {selectedProduct.mcode && (
                <span className="font-mono text-indigo-300 font-bold shrink-0">
                  [{selectedProduct.mcode}]
                </span>
              )}
              <span className="text-white font-semibold truncate">{selectedProduct.name}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                (selectedProduct.currentQuantity || 0) <= 0
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : (selectedProduct.currentQuantity || 0) <= 10
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                Stock: {selectedProduct.currentQuantity}
              </span>
            </div>
          ) : (
            <span className="text-slate-300 font-medium">All Stock / Items ({products.length})</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedProduct && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Clear item filter"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-[420px] mt-1 z-50 bg-slate-900 border border-indigo-500/50 rounded-xl shadow-2xl p-2.5 backdrop-blur-md">
          {/* Search Bar inside Dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-indigo-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick status bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 mb-1 font-mono">
            <span>Showing {filteredProducts.length} items</span>
            {selectedCategory && (
              <span className="text-indigo-400 font-sans font-bold">
                Category: {selectedCategory}
              </span>
            )}
          </div>

          {/* Scrollable list */}
          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5">
            {/* Option 0: All Items */}
            <div
              onClick={() => handleSelect('')}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                !selectedProductId
                  ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/40'
                  : highlightedIndex === 0
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                <span>All Stock / Items</span>
              </div>
              {!selectedProductId && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 font-sans">
                No items match &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isSelected = selectedProductId === p.id;
                const isHighlighted = highlightedIndex === idx + 1;
                const qCtn = p.qtyInCarton && p.qtyInCarton > 0 ? p.qtyInCarton : 1;
                const ctnCount = qCtn > 1 ? Math.floor((p.currentQuantity || 0) / qCtn) : null;
                const looseCount = qCtn > 1 ? Number(((p.currentQuantity || 0) % qCtn).toFixed(1)) : null;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/40'
                        : isHighlighted
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {p.mcode && (
                        <span className="font-mono text-[11px] text-indigo-400 shrink-0 font-bold bg-indigo-950/80 px-1 py-0.5 rounded border border-indigo-800/40">
                          {p.mcode}
                        </span>
                      )}
                      <div className="truncate">
                        <div className="text-white font-medium truncate">{p.name}</div>
                        {p.category && (
                          <span className="text-[10px] text-slate-500 block truncate">
                            {p.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-[11px] font-mono font-bold block ${
                        (p.currentQuantity || 0) <= 0
                          ? 'text-rose-400'
                          : (p.currentQuantity || 0) <= 10
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        {p.currentQuantity || 0} {p.unit || 'units'}
                      </span>
                      {ctnCount !== null && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {ctnCount} CTN {looseCount && looseCount > 0 ? `+${looseCount}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
