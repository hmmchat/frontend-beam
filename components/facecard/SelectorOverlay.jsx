'use client';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

export default function SelectorOverlay({
  showSelector,
  setShowSelector,
  user,
  toggleInterest,
  toggleValue,
  toggleBrand,
  allZodiacs,
  selectZodiac,
  allInterests,
  allValues,
  allBrands,
  musicQuery,
  setMusicQuery,
  musicResults,
  searchingMusic,
  searchMusic,
  selectMusic,
  musicSavingKey,
  musicTrackKey,
  searchQuery,
  setSearchQuery,
  searchItems,
  loadMoreSuggestions,
  isSearchingItems,
  isLoadingMoreSuggestions
}) {
  const [localResults, setLocalResults] = React.useState([]);

  React.useEffect(() => {
    setSearchQuery("");
  }, [showSelector, setSearchQuery]);

  if (!showSelector) return null;

  const selectorTitle =
    showSelector === 'values' ? 'causes' : showSelector;

  return (
    <div
      className="fixed inset-0 z-[100] bg-purple-950 text-white flex flex-col animate-fade-in overflow-y-auto"
      style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}
    >
      <div className="w-full max-w-2xl mx-auto px-6 py-12 pb-[calc(7rem+env(safe-area-inset-bottom))] flex flex-col gap-10">

        {/* Header Area */}
        <div className="md:space-y-8 space-y-4">

          <div className='flex items-center gap-4'>
            <button
              onClick={() => setShowSelector(null)}
              className="md:w-14 md:h-14 w-10 h-10 rounded-full border border-white/40 flex items-center justify-center  backdrop-blur-md  transition shadow-xl"
            >
              <span className="md:text-2xl text-sm text-white">  <ArrowLeft size={24} /> </span>
            </button>

            <h1 className=" text-xl md:font-extrabold tracking-tight capitalize  md:hidden">{selectorTitle}</h1>
          </div>


        </div>

        {showSelector === 'zodiacs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
              {(allZodiacs || []).length > 0 ? (
                allZodiacs.map((z) => {
                  const isSelected = user?.zodiacId === z.id || user?.zodiac?.id === z.id;
                  return (
                    <button
                      key={z.id}
                      onClick={() => selectZodiac && selectZodiac(z.id)}
                      className={`flex items-center gap-4 px-6 py-4 rounded-3xl border transition-all duration-300 transform active:scale-95 group ${isSelected
                        ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-[0_0_20px_rgba(250,204,21,0.5)]'
                        : ' text-white border-white/20 hover:border-white/60 hover:bg-white/10 shadow-lg'
                        }`}
                    >
                      {z.imageUrl ? (
                        <div className="w-10 h-10 flex items-center justify-center p-1 bg-black/10 rounded-xl">
                          <img src={z.imageUrl} alt={z.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isSelected ? 'bg-black/20' : 'bg-white/10'}`}>
                          ✨
                        </div>
                      )}
                      <span className="text-sm font-bold uppercase tracking-widest">{z.name}</span>
                    </button>
                  );
                })
              ) : (
                <div className="w-full py-12 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10">
                  <div className="w-12 h-12 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                  <p className="text-white/40 text-sm italic">Summoning zodiac signs...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showSelector === 'music' && (
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                value={musicQuery}
                onChange={(e) => {
                  setMusicQuery(e.target.value);
                  searchMusic(e.target.value);
                }}
                placeholder="Search for a song..."
                className="w-full  border border-white/20 md:rounded-2xl rounded-xl md:px-6 md:py-4 py-3 px-4 text-lg focus:outline-none focus:border-yellow-400 transition"
              />
              {searchingMusic && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {musicResults.map((song) => {
                const rowKey = musicTrackKey ? musicTrackKey(song) : song.spotifyId || song.name;
                const saving = Boolean(musicSavingKey && musicTrackKey && musicTrackKey(song) === musicSavingKey);
                const busy = Boolean(musicSavingKey);
                return (
                  <div
                    key={rowKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => !busy && selectMusic(song)}
                    onKeyDown={(e) => {
                      if (busy) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectMusic(song);
                      }
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition group ${saving
                      ? 'bg-yellow-400/20 border-yellow-400/50 cursor-wait'
                      : busy
                        ? ' border-white/10 opacity-60 cursor-not-allowed'
                        : ' border-white/10 hover:bg-white/10 0  meeting now'
                      }`}
                  >
                    <img
                      src={song.albumArtUrl || "https://ui-avatars.com/api/?name=Music&background=random&color=fff"}
                      alt={song.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="md:font-bold truncate group-hover:text-yellow-400 transition">{song.name}</h4>
                      <p className="text-sm opacity-60 font-outfit truncate">{song.artist}</p>
                    </div>
                    {saving ? (
                      <div className="h-6 w-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <div className="text-yellow-400 opacity-0 group-hover:opacity-100 transition text-xl">
                        +
                      </div>
                    )}
                  </div>
                );
              })}
              {musicQuery.length > 2 && musicResults.length === 0 && !searchingMusic && (
                <p className="text-center opacity-40 py-10">{`No songs found for "${musicQuery}"`}</p>
              )}
            </div>
          </div>
        )}

        {(showSelector === 'interests' || showSelector === 'values' || showSelector === 'brands') && (
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchItems(showSelector, e.target.value);
                }}
                placeholder={`Search for your favorite ${showSelector === 'brands' ? 'brands' : showSelector === 'interests' ? 'interests' : 'causes'}...`}
                className="w-full bg-transparent text-white placeholder:text-white/50 border border-white/40 md:rounded-2xl rounded-xl md:px-4 md:py-3 py-3 px-4 text-base md:text-lg md:font-light focus:outline-none focus:border-yellow-400 transition"
              />
              {isSearchingItems && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {(() => {
                const results = showSelector === 'interests' ? allInterests : showSelector === 'values' ? allValues : allBrands;

                // 1. Get truly selected items (from user state)
                const selectedOnes = (showSelector === 'interests'
                  ? user?.interests?.map(i => ({ id: i.interestId, name: i.interest?.name || i.name }))
                  : showSelector === 'values'
                    ? user?.values?.map(v => ({ id: v.valueId, name: v.value?.name || v.name }))
                    : user?.brandPreferences?.map(b => ({ id: b.brandId, name: b.brand?.name, logoUrl: b.brand?.logoUrl }))
                ) || [];

                // 2. Idle: selected items first, then a short suggestion list.
                //    Search: show API matches from the full catalog (do not cap to the idle 8/10).
                const selectedIds = new Set(selectedOnes.map(s => s.id));
                const isSearching = Boolean(searchQuery?.trim());
                let unifiedList = isSearching
                  ? results.filter((item) => item && item.id)
                  : [
                      ...selectedOnes,
                      ...results.filter(item => !selectedIds.has(item.id))
                    ];

                const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
                if (isMobile && !isSearching && showSelector === 'brands') {
                  unifiedList = unifiedList.slice(0, 10);
                }

                const showSearchForMore =
                  !isSearching && (showSelector === 'interests' || showSelector === 'values');

                if (unifiedList.length === 0 && !isSearchingItems && !showSearchForMore) {
                  return <p className="text-white/30 text-xs italic py-4">No results found...</p>;
                }

                return (
                  <>
                    {unifiedList.map(item => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (showSelector === 'interests') toggleInterest(item.id, item.name);
                            else if (showSelector === 'values') toggleValue(item.id, item.name);
                            else toggleBrand(item.id, item.name, item.logoUrl);
                          }}
                          className={`flex items-center gap-2 md:px-6 md:py-3 py-2 px-3 md:rounded-2xl rounded-xl border  border-b-2 transition-all duration-300 transform active:scale-95 ${isSelected
                            ? 'bg-yellow-400 text-black  md:font-bold '
                            : ' text-white border-white/40 hover:border-white/40'
                            }`}
                        >
                          {item.logoUrl && <img src={item.logoUrl} alt="" className="w-5 h-5 object-contain" />}
                          <p className="text-sm font-outfit">{item.name}</p>
                          <span className="md:text-lg text-xs leading-none">{isSelected ? '✕' : <img width={12} height={12} src="/assets/plus.png" alt="" />}</span>
                        </button>
                      );
                    })}
                    {showSearchForMore && (
                      <button
                        type="button"
                        onClick={() => loadMoreSuggestions && loadMoreSuggestions(showSelector)}
                        disabled={isLoadingMoreSuggestions}
                        className="flex items-center gap-2 md:px-6 md:py-3 py-2 px-3 md:rounded-2xl rounded-xl border border-b-2 border-white/40 text-white hover:border-white/40 transition-all duration-300 transform active:scale-95 disabled:opacity-60"
                      >
                        <p className="text-sm font-outfit">search for more</p>
                        <span className="md:text-lg text-xs leading-none">
                          {isLoadingMoreSuggestions ? (
                            <span className="inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <img width={12} height={12} src="/assets/plus.png" alt="" />
                          )}
                        </span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Floating Bottom Bar */}
        <div className="fixed md:bottom-8 bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50">
          <button
            onClick={() => setShowSelector(null)}
            className="w-full md:py-4 py-3 bg-yellow-400 text-black text-xs md:text-base md:rounded-2xl rounded-lg font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all "
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
