'use client';

export default function FacecardEditor({
  user,
  firstName,
  zodiac,
  setView,
  handleSlotClick,
  setShowSelector,
  onPickZodiac,
  progress,
  fileInputRef,
  handleFileChange,
  onOpenFacecardPreview,
  photoUploading = false,
}) {
  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden p-0 text-white outfit-font md:p-4"
      style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* --- MOBILE VIEW (Matches Screenshot) --- */}
      <div className="flex h-screen border rounded-[3rem]  w-full flex-col md:hidden overflow-y-auto px-6 py-8 gap-6 animate-fade-in relative z-10">

        {/* Header: Close, Name, Progress */}
        <div className="flex justify-between items-start pt-2">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setView('success')}
              className="w-12 h-12 rounded-full border border-white/50 flex items-center justify-center text-xl hover:bg-white/10"
            >✕</button>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold tracking-tight">{firstName}</h2>
              <p className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-mono">UserID: {user?.id?.slice(0, 8)}</p>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(255,200,0,0.3)]" viewBox="0 0 100 100">
              <circle className="text-white/10" strokeWidth="8" cx="50" cy="50" r="42" fill="transparent" stroke="currentColor"></circle>
              <circle className="text-yellow-400 transition-all duration-1000" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="42" fill="transparent" stroke="currentColor" strokeDasharray="264" strokeDashoffset={264 - (264 * (progress / 100))} transform="rotate(-90 50 50)"></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Basic Info Rows & Icons Area */}
        <div className="grid grid-cols-10 gap-3 items-stretch">
          <div className="col-span-6 space-y-3">
            <div className="relative border-white/20 p-3 py-4 rounded-xl bg-white/5 flex flex-col justify-center">
              <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
              <p className="text-[9px] uppercase tracking-widest leading-none opacity-60">DOB: {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("en-GB") : "22/08/1998"}</p>
              <p className="text-[9px] uppercase tracking-widest mt-1.5 font-bold">Zodiac: {zodiac?.name}</p>
            </div>
            <div className="relative p-3 py-4 rounded-xl bg-white/5 flex flex-col justify-center">
              <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
              <p className="text-[9px] uppercase tracking-widest leading-none opacity-60">Gender Identity</p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5">{user?.gender || "Female"}</p>
            </div>
          </div>

          <div className="col-span-4 flex flex-col gap-3">
            <div className="flex gap-2 h-1/2">
              <button
                onClick={onPickZodiac || (() => setShowSelector('zodiacs'))}
                className="flex-1 border border-white/60 rounded-xl flex items-center justify-center bg-white/5 shadow-inner"
              >
                {user?.zodiac?.imageUrl ? <img src={user.zodiac.imageUrl} className="h-8 w-8 object-contain" /> : <span className="text-3xl">{zodiac?.symbol}</span>}
              </button>
              <button
                onClick={() => { }} // Placeholder for gender edit if needed
                className="flex-1 border border-white/60 rounded-xl flex items-center justify-center text-2xl bg-white/5 shadow-inner"
              >
                {user?.gender === 'MALE' ? '♂' : user?.gender === 'FEMALE' ? '♀' : '⚧'}
              </button>
            </div>
            <button
              onClick={() => onOpenFacecardPreview?.()}
              className="w-full flex-1 border border-white/60 rounded-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 active:scale-95 transition"
            >
              <span className="text-base">👁</span> Facecard
            </button>
          </div>
        </div>

        {/* Action Rows: Interests, Causes, Brands */}
        <div className="flex flex-col gap-5">
          {/* Interests */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-wide w-14">Interests</span>
            <div
              onClick={() => setShowSelector('interests')}
              className="flex-1 h-12 border border-white/40 rounded-[1.2rem] px-5 flex items-center text-[11px] opacity-70 bg-white/5 truncate cursor-pointer"
            >
              {user?.interests?.map(i => i.interest?.name || i.name).join(', ') || 'Select Interests...'}
            </div>
            <button onClick={() => setShowSelector('interests')} className="w-12 h-12 border border-white/60 rounded-xl text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition">+</button>
          </div>

          {/* Causes */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-wide w-14">Causes</span>
            <div
              onClick={() => setShowSelector('values')}
              className="flex-1 h-12 border border-white/40 rounded-[1.2rem] px-5 flex items-center text-[11px] opacity-70 bg-white/5 truncate cursor-pointer"
            >
              {user?.values?.map(v => v.value?.name || v.name).join(', ') || 'Select Causes...'}
            </div>
            <button onClick={() => setShowSelector('values')} className="w-12 h-12 border border-white/60 rounded-xl text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition">+</button>
          </div>

          {/* Brands */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-wide w-14">Brands</span>
            <div className="flex-1 flex gap-2.5 overflow-x-auto scrollbar-hide py-1">
              {[0, 1, 2, 3, 4].map(i => {
                const selection = user?.brandPreferences?.[i];
                return (
                  <div key={i} onClick={() => setShowSelector('brands')} className="w-11 h-11 shrink-0 border-2 border-white/40 rounded-full flex items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10">
                    {selection ? <img src={selection.brand?.logoUrl} className="w-7 h-7 object-contain" /> : <span className="opacity-40 text-xl">+</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Photo Slots Section */}
        <div className="relative group">
          {photoUploading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-3xl bg-black/60 backdrop-blur-sm">
              <div className="h-10 w-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {/* Photo 1 (DP) */}
            <div onClick={() => handleSlotClick(0)} className="w-[150px] h-[220px] shrink-0 border-2 border-b-8 border-white/50 rounded-[2rem] overflow-hidden relative shadow-2xl">
              <img src={user?.displayPictureUrl || "/imageprofile.png"} className="w-full h-full object-cover" alt="DP" />
              <div className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-black text-[10px] shadow-lg">✎</div>
            </div>
            {/* Other Slots */}
            {[0, 1].map((idx) => {
              const photo = user?.photos?.find(p => p.order === idx);
              return (
                <div key={idx} onClick={() => handleSlotClick(idx + 1)} className="w-[150px] h-[220px] shrink-0 border-2 border-b-8 border-white/20 rounded-[2rem] flex items-center justify-center relative overflow-hidden bg-white/5 shadow-inner">
                  {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : <div className="w-12 h-12 border-2 border-white/60 rounded-full flex items-center justify-center text-3xl opacity-40">+</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer: Music & Dots */}
        <div className="flex justify-between items-end mt-auto mb-4">
          {/* Music Record Button */}
          <div onClick={() => setShowSelector('music')} className="relative group cursor-pointer active:scale-95 transition">
            <div className="w-36 h-36 rounded-full border-8 border-white/5 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 animate-spin-slow">
                <img src={user?.musicPreference?.albumArtUrl || "/spotify1.png"} className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="absolute w-10 h-10 rounded-full bg-black/50 border border-white/30 flex items-center justify-center backdrop-blur-md">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20 border border-white/40"></div>
              </div>
              <div className="absolute -bottom-2 bg-black/60 px-4 py-1.5 rounded-full border border-white/20 text-[9px] font-bold tracking-widest uppercase">
                {user?.musicPreference?.name?.slice(0, 10) || 'Select'}
              </div>
            </div>
          </div>

          {/* Dots & Version */}
          <div className="flex flex-col items-end gap-6 pb-2">
            <div className="grid grid-cols-6 gap-2.5 opacity-20">
              {[...Array(24)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-white rounded-full"></div>)}
            </div>
            <p className="text-[10px] opacity-40 font-black uppercase tracking-tighter text-right">Facecard creation tool V1</p>
          </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>


      {/* --- DESKTOP VIEW (Original Scaled Design) --- */}
      <div className="relative hidden md:flex max-h-full min-h-0 w-full max-w-[1150px] origin-center scale-[0.62] flex-col gap-4 overflow-hidden rounded-[3rem] border-2 border-white/60 p-3 sm:scale-[0.72] md:scale-90 md:flex-row md:gap-6 md:rounded-[4rem] md:p-5 lg:scale-100">

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
            <div className="relative flex gap-4 justify-center">
              {photoUploading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-[2.5rem] bg-black/55 backdrop-blur-sm">
                  <div className="h-10 w-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/90">Uploading &amp; saving…</p>
                </div>
              )}

              {/* Slot 1 */}
              <div
                onClick={() => handleSlotClick(0)}
                className={`w-[200px] h-[300px] border-b-6 rounded-[2.5rem] border border-2 border-white/50 overflow-hidden relative ${photoUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'
                  }`}
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
                className={`w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden bg-white/5 transition-colors ${photoUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-white/10'
                  }`}
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
                className={`w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden bg-white/5 transition-colors ${photoUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-white/10'
                  }`}
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
                accept="image/jpeg,image/png,image/webp,image/gif"
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
                  Zodiac : {zodiac?.name}
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
                  Can&apos;t live w/o &#39;em
                </p>
              </div>
            </div>

            {/* Icon Pills & Brand Grid */}
            <div className="col-span-7 space-y-12 mb-2">

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onPickZodiac === 'function') onPickZodiac();
                    else setShowSelector('zodiacs');
                  }}
                  className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center shadow-inner overflow-hidden hover:bg-white/5 transition"
                  aria-label="Change zodiac"
                >
                  {user?.zodiac?.imageUrl ? (
                    <img src={user.zodiac.imageUrl} alt={user.zodiac.name || 'Zodiac'} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-4xl">{zodiac?.symbol}</span>
                  )}
                </button>

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
                            {selection.brand?.name?.slice(0, 2)}
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

            <button
              type="button"
              onClick={() => onOpenFacecardPreview?.()}
              className="w-full py-4 border-2 border-white/30 rounded-3xl flex items-center justify-center gap-3 hover:bg-white/5 transition font-bold tracking-widest uppercase text-xs"
            >
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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
