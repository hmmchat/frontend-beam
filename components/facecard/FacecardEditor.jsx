'use client';

export default function FacecardEditor({ 
  user, 
  firstName, 
  zodiac, 
  setView, 
  handleSlotClick, 
  setShowSelector, 
  progress,
  fileInputRef,
  handleFileChange
}) {
  return (
    <div className="min-h-screen w-full relative text-white outfit-font overflow-hidden flex items-center justify-center p-6" 
         style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      
      {/* Outer Glow Card */}
      <div className="w-full max-w-[1150px] relative border border-2 border-white/60 rounded-[4rem] p-6 flex gap-10">
        
        {/* Main Editor UI */}
        <div className="flex-1 border border-2 border-white/40 rounded-[3.5rem] p-8 relative flex flex-col gap-10">
          
          {/* Top Header Row */}
          <div className="flex items-start gap-6 ">

            {/* Left: Back + Vertical Name */}
            <div className="relative flex flex-col items-start ">

              {/* Back Button */}
              <button 
                onClick={() => setView('success')}
                className="w-14 h-14 rounded-full border border-white/80 flex items-center justify-center hover:bg-white/10 transition"
              >
                <span className="text-2xl mb-1">←</span>
              </button>

              {/* Vertical Name Wrapper */}
              <div className="relative h-[264px] w-[70px] flex items-center justify-center">
                
                {/* Rotated content */}
                <div className="absolute rotate-[-90deg] whitespace-nowrap px-12 py-2 relative">

                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60"></span>
                  <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60"></span>
                  <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60"></span>
                  <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60"></span>

                  <h2 className="text-3xl font-black tracking-wide uppercase leading-none text-center">
                    {firstName}
                  </h2>

                  <p className="text-[11px] opacity-40 font-mono tracking-widest uppercase mt-1 text-center">
                    USERID: {user?.id?.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Photo Slots */}
            <div className="flex gap-4 justify-center">

              {/* Slot 1 */}
              <div 
                onClick={() => handleSlotClick(0)}
                className="w-[200px] h-[300px] border-b-6 rounded-[2.5rem] border border-2 border-white/50 overflow-hidden relative cursor-pointer"
              >
                <img
                  src={user?.displayPictureUrl || "/imageprofile.png"}
                  className="w-full h-full object-cover"
                  alt="Photo 1"
                />
                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm shadow-lg">
                  ✎
                </button>
              </div>

              {/* Slot 2 (Photo Order 0) */}
              <div 
                onClick={() => handleSlotClick(1)}
                className="w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
              >
                {user?.photos?.find(p => p.order === 0)?.url ? (
                  <img src={user.photos.find(p => p.order === 0).url} className="w-full h-full object-cover" alt="Photo 2" />
                ) : (
                  <span className="text-5xl opacity-60 border border-4 border-white/80 rounded-full px-3">+</span>
                )}
              </div>

              {/* Slot 3 (Photo Order 1) */}
              <div 
                onClick={() => handleSlotClick(2)}
                className="w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
              >
                {user?.photos?.find(p => p.order === 1)?.url ? (
                  <img src={user.photos.find(p => p.order === 1).url} className="w-full h-full object-cover" alt="Photo 3" />
                ) : (
                  <span className="text-5xl opacity-60 border border-4 border-white/80 rounded-full px-3">+</span>
                )}
              </div>

              {/* Hidden File Input */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Info Sections Area */}
          <div className="grid grid-cols-10 gap-10 items-center">
            
            {/* DOB & Gender Text Labels */}
            <div className="col-span-3 space-y-14">

              {/* DOB + Zodiac */}
              <div className="relative px-5 py-5">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

                <p className="text-[9px] uppercase tracking-widest opacity-80">
                  DOB : {user?.dateOfBirth
                    ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                    : "22/08/1998"}
                </p>
                <p className="text-[9px] uppercase tracking-widest opacity-80 mt-1">
                  Zodiac : {zodiac.name}
                </p>
              </div>

              {/* Gender */}
              <div className="relative px-4 py-5">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

                <p className="text-[9px] uppercase tracking-widest opacity-80">
                  Gender Identity
                </p>
                <p className="text-[9px] uppercase tracking-widest opacity-80 mt-1">
                  {user?.gender || "Female"}
                </p>
              </div>

              {/* Brands */}
              <div className="relative px-4 py-5">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

                <p className="text-[9px] font-bold uppercase tracking-widest">
                  Brands
                </p>
                <p className="text-[9px] uppercase tracking-tight opacity-50 mt-1">
                  Can't live w/o 'em
                </p>
              </div>
            </div>

            {/* Icon Pills & Brand Grid */}
            <div className="col-span-7 space-y-12 mb-2">
              
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center text-4xl shadow-inner">
                    {zodiac.symbol}
                  </div>

                  <div 
                    onClick={() => setShowSelector('interests')}
                    className="flex-1 h-16 rounded-full border border-white/60 px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                  >
                    <span className="text-sm opacity-60 tracking-wide">Interests:</span>
                    <span className="text-sm opacity-90 truncate max-w-[150px]">
                      {user?.interests?.map(i => i.interest?.name || i.name).filter(Boolean).join(', ') || 'Basketball, Music...'}
                    </span>
                  </div>

                  <button 
                    onClick={() => setShowSelector('interests')}
                    className="w-18 h-18 rounded-2xl border border-white/80 flex items-center justify-center text-3xl transition hover:bg-white/10"
                  >+</button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center text-3xl shadow-inner">
                    {user?.gender === 'MALE' ? '♂' : user?.gender === 'FEMALE' ? '♀' : '⚧'}
                  </div>

                  <div 
                    onClick={() => setShowSelector('values')}
                    className="flex-1 h-16 rounded-full border border-white/50 px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                  >
                    <span className="text-sm opacity-60 tracking-wide">Causes:</span>
                    <span className="text-sm opacity-90 italic truncate max-w-[150px]">
                      {user?.values?.map(v => v.value?.name || v.name).filter(Boolean).join(', ') || 'Environment, Equality...'}
                    </span>
                  </div>

                  <button 
                    onClick={() => setShowSelector('values')}
                    className="w-18 h-18 rounded-2xl border border-white/80 flex items-center justify-center text-3xl transition hover:bg-white/10"
                  >+</button>
                </div>

                {/* Brand Icons Row */}
                <div className="flex gap-6 mt-5  scrollbar-hide">
                  {[0, 1, 2, 3, 4].map(i => {
                    const selection = user?.brandPreferences?.[i];
                    return (
                      <div 
                        key={i} 
                        onClick={() => setShowSelector('brands')}
                        className={`relative w-20 h-20 rounded-2xl border border-2 border-b-6 border-white/50 flex items-center justify-center shadow-inner cursor-pointer transition-all hover:scale-105 ${selection ? 'bg-white/10' : 'bg-transparent'}`}
                      >
                      {selection && (
                        selection.brand?.logoUrl ? (
                          <img
                            src={selection.brand.logoUrl}
                            alt={selection.brand.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <span className="text-white font-bold text-xl">
                            {selection.brand?.name?.slice(0,2)}
                          </span>
                        )
                      )}
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>

        {/* Right Side Info Col */}
        <div className="w-72 flex flex-col gap-10 py-6 pr-4">
            
            {/* Progress Area */}
            <div className="flex flex-col items-center gap-6">
               <div className="relative w-48 h-48">
                  <div className="absolute inset-0 rounded-full border-[10px] border-white/5"></div>
                  <div className="absolute inset-0 rounded-full border-[12px] border-yellow-400 opacity-20 blur-xl scale-110"></div>
                  
                  <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(255,200,0,0.5)]" viewBox="0 0 100 100">
                    <circle className="text-white/10" strokeWidth="6" cx="50" cy="50" r="44" fill="transparent" stroke="currentColor"></circle>
                    <circle 
                        className="text-yellow-400 transition-all duration-1000" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        cx="50" 
                        cy="50" 
                        r="44" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeDasharray="276" 
                        strokeDashoffset={276 - (276 * (progress / 100))} 
                        transform="rotate(-90 50 50)"
                    ></circle>
                  </svg>
                  
                  <div className="absolute inset-0 flex items-end justify-center mb-18">
                    <span className="text-5xl font-black text-white/90">{progress}<span className="text-xl opacity-40 ml-1">%</span></span>
                  </div>
               </div>

               <button className="w-full py-4 border-2 border-white/30 rounded-3xl flex items-center justify-center gap-3 hover:bg-white/5 transition font-bold tracking-widest uppercase text-xs">
                  <span className="text-lg">👁</span> Facecard
               </button>
            </div>

            {/* Music Section */}
            <div 
              onClick={() => setShowSelector('music')}
              className="flex-1 flex flex-col items-center gap-6 relative cursor-pointer group"
            >
                <div className="relative w-44 h-44">
                    <div className="absolute inset-0 rounded-full border-[3px] border-white/20 animate-spin-slow"></div>
                    <div className="absolute inset-2 rounded-full overflow-hidden animate-spin-slow border-2 border-white/10 shadow-2xl">
                        <img 
                          src={user?.musicPreference?.albumArtUrl || "/spotify1.png"} 
                          className="w-full h-full object-cover rounded-full opacity-90 group-hover:opacity-100 transition-opacity" 
                          alt="Album Art" 
                        />
                    </div>
                    <div className="absolute inset-[4.5rem] bg-black/40 rounded-full border border-white/20 z-10 flex items-center justify-center shadow-inner backdrop-blur-md">
                       <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40"></div>
                    </div>
                </div>

                <div className="relative w-full py-6 flex justify-center">
                  <div className="relative px-16 py-4 text-center text-white">
                    <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60" />
                    <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60" />
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60" />
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60" />

                    <p className="text-sm font-medium">{user?.musicPreference?.name || user?.musicPreference?.songName || 'Select Song'}</p>
                    <p className="text-xs opacity-60">{user?.musicPreference?.artist || user?.musicPreference?.artistName || 'Spotify'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-1 opacity-70">
                   {[...Array(36)].map((_, i) => <div key={i} className="w-1 h-1 bg-white rounded-full"></div>)}
                </div>
            </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
