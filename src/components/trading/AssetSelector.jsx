import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { getUnderlyingAssets, getLotSizes } from '../../utils/simulatorUtils';

export function AssetSelector({ selectedAsset, onAssetSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState({ indices: [], delta: [], stocks: [] });
  const [lotSizes, setLotSizes] = useState({});
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen && assets.indices.length === 0) {
      setIsLoading(true);
      Promise.all([getUnderlyingAssets(), getLotSizes()])
        .then(([assetsData, lotSizesData]) => {
          // Filter out items that have an empty lot size object
          const filterWithLots = (list) => {
            return list.filter(item => {
              const lots = lotSizesData[item.underlying];
              return lots && Object.keys(lots).length > 0;
            });
          };

          setAssets({
            indices: filterWithLots(assetsData.indices),
            delta: assetsData.delta, // Delta assets don't use this NSE lot-size endpoint
            stocks: filterWithLots(assetsData.stocks)
          });
          setLotSizes(lotSizesData);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch assets or lot sizes", err);
          setIsLoading(false);
        });
    }
    setIsOpen(!isOpen);
  };

  const getActiveLotSize = (underlying) => {
    const assetLots = lotSizes[underlying];
    if (assetLots) {
      const dates = Object.keys(assetLots);
      if (dates.length > 0) return assetLots[dates[0]][0];
    }
    return '-';
  };

  const { indices, delta, stocks } = assets;

  // Search filtering logic could be added here
  const filterAssets = (list) => {
    let result = list;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = list.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        item.desc.toLowerCase().includes(lowerQuery)
      );
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  };

  const filteredIndices = filterAssets(indices);
  const filteredDelta = filterAssets(delta);
  const filteredStocks = filterAssets(stocks);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center gap-1 text-sm font-medium text-slate-700 cursor-pointer"
        onClick={toggleDropdown}
      >
        {selectedAsset.name} (Lot size: {lotSizes[selectedAsset.underlying] ? getActiveLotSize(selectedAsset.underlying) : 30}) <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden flex flex-col max-h-[350px]">
          {/* Search */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-white sticky top-0">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search" 
              className="flex-1 border-none outline-none text-xs placeholder:text-slate-400"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto pb-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-500" />
                <span className="text-xs font-medium">Loading assets...</span>
              </div>
            ) : (
              <>
                {/* INDEX Category */}
                {filteredIndices.length > 0 && (
                  <>
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      INDEX - ({filteredIndices.length})
                    </div>
                    {filteredIndices.map(item => (
                      <AssetItem 
                        key={item.id} 
                        item={item} 
                        selected={item.id === selectedAsset.id} 
                        onSelect={() => { onAssetSelect(item); setIsOpen(false); }} 
                      />
                    ))}
                    <div className="h-px bg-slate-100 w-full my-1"></div>
                  </>
                )}

                {/* DELTA EXCHANGE Category */}
                {filteredDelta.length > 0 && (
                  <>
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      DELTA EXCHANGE - ({filteredDelta.length})
                    </div>
                    {filteredDelta.map(item => (
                      <AssetItem 
                        key={item.id} 
                        item={item} 
                        selected={item.id === selectedAsset.id} 
                        onSelect={() => { onAssetSelect(item); setIsOpen(false); }} 
                      />
                    ))}
                    <div className="h-px bg-slate-100 w-full my-1"></div>
                  </>
                )}

                {/* STOCKS Category */}
                {filteredStocks.length > 0 && (
                  <>
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      STOCKS - ({filteredStocks.length})
                    </div>
                    {filteredStocks.map(item => (
                      <AssetItem 
                        key={item.id} 
                        item={item} 
                        selected={item.id === selectedAsset.id} 
                        onSelect={() => { onAssetSelect(item); setIsOpen(false); }} 
                      />
                    ))}
                  </>
                )}

                {filteredIndices.length === 0 && filteredDelta.length === 0 && filteredStocks.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No matching assets found.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetItem({ item, selected, onSelect }) {
  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}
      onClick={onSelect}
    >
      <img src={item.icon} alt={item.name} className="w-5 h-5 rounded bg-slate-100 object-contain p-0.5 border border-slate-200" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-800 leading-none">{item.name}</span>
        <span className="text-[9px] text-slate-500 mt-0.5">{item.desc}</span>
      </div>
    </div>
  );
}
