'use client';

export default function SelectorOverlay({
  showSelector,
  setShowSelector,
  user,
  toggleInterest,
  toggleValue,
  toggleBrand,
  allInterests,
  allValues,
  allBrands,
  musicQuery,
  setMusicQuery,
  musicResults,
  searchingMusic,
  searchMusic,
  selectMusic
}) {
  if (!showSelector) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-purple-950 flex flex-col animate-fade-in overflow-y-auto"
      style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}
    >
      <div className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-10">
        
        {/* Header Area */}
        <div className="space-y-8">
          <button 
            onClick={() => setShowSelector(null)}
            className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center bg-white/5 backdrop-blur-md hover:bg-white/10 transition shadow-xl"
          >
            <span className="text-2xl text-white">←</span>
          </button>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight capitalize">{showSelector}</h1>
            <p className="text-white/80 leading-relaxed text-sm max-w-md">
              {showSelector === 'interests' && "Select things you love to do. These help us find people who share your passions and give you something to yap about!"}
              {showSelector === 'values' && "Select what you care about. These values help connect you with people who share your vision of the world."}
              {showSelector === 'brands' && "Select your favorite brands. These show what you're into and help find people with similar tastes."}
              {showSelector === 'music' && "Pick your anthem. The music you love says a lot about your vibe!"}
            </p>
          </div>
        </div>

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
                className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-yellow-400 transition"
              />
              {searchingMusic && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {musicResults.map((song) => (
                <div
                  key={song.spotifyId}
                  onClick={() => selectMusic(song)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition group"
                >
                  <img
                    src={song.albumArtUrl || "https://ui-avatars.com/api/?name=Music&background=random&color=fff"}
                    alt={song.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate group-hover:text-yellow-400 transition">{song.name}</h4>
                    <p className="text-sm opacity-60 truncate">{song.artist}</p>
                  </div>
                  <div className="text-yellow-400 opacity-0 group-hover:opacity-100 transition text-xl">
                    +
                  </div>
                </div>
              ))}
              {musicQuery.length > 2 && musicResults.length === 0 && !searchingMusic && (
                <p className="text-center opacity-40 py-10">No songs found for "{musicQuery}"</p>
              )}
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="space-y-12 pb-20">
          {/* Flat List of Interests */}
          {showSelector === 'interests' && (
            <div className="flex flex-wrap gap-3 pb-8">
              {allInterests.map(item => {
                const isSelected = user?.interests?.some(i => i.interestId === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleInterest(item.id, item.name)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all duration-300 transform active:scale-95 ${
                      isSelected 
                        ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
                        : 'bg-white/5 text-white border-white/20 hover:border-white/40'
                    }`}
                  >
                    <span className="text-sm uppercase tracking-wide">{item.name}</span>
                    <span className="text-lg leading-none">{isSelected ? '✕' : '+'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {(showSelector === 'values' || showSelector === 'brands') && (
            <div className="flex flex-wrap gap-3">
              {(showSelector === 'values' ? allValues : allBrands).map(item => {
                const isSelected = showSelector === 'values' 
                  ? user?.values?.some(v => v.valueId === item.id)
                  : user?.brandPreferences?.some(b => b.brandId === item.id);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (showSelector === 'values') toggleValue(item.id, item.name);
                      else toggleBrand(item.id, item.name, item.logoUrl);
                    }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 transform active:scale-95 ${
                      isSelected 
                        ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
                        : 'bg-white/5 text-white border-white/20 hover:border-white/40'
                    }`}
                  >
                    {item.logoUrl && <img src={item.logoUrl} alt="" className="w-5 h-5 object-contain" />}
                    <span className="text-sm uppercase tracking-wide">{item.name}</span>
                    <span className="text-lg leading-none">{isSelected ? '✕' : '+'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Bottom Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
          <button 
            onClick={() => setShowSelector(null)}
            className="w-full py-4 bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
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
