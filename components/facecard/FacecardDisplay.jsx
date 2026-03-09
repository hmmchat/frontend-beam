'use client';

export default function FacecardDisplay({ user, firstName, zodiac, age, setView, router }) {
  return (
    <div className="max-h-screen gap-4 w-full relative bg-purple-950 text-white outfit-font overflow-hidden flex items-center justify-center p-6" 
         style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      
      <section className="flex flex-col items-center justify-center w-full text-center animate-fade-in border-2 border-white/40 h-[100vh] rounded-[3.5rem]">
        <div className="w-full max-w-[1000px] grid gap-12 h-[75vh] mx-auto justify-center items-center ">
          
          {/* Left Pane - Facecard Preview */}
          <div className="relative border-2 border-white/40 w-[500px] py-2 flex items-center justify-center pl-22 rounded-[3.5rem]">
            
            {/* Vertical Name + Age - Outer left */}
            <div className="absolute left-10 -bottom-20 -translate-y-1/2">
              <span
                className="text-6xl font-black text-yellow-400 tracking-tighter uppercase"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {firstName} , 
                <span
                  className="text-transparent"
                  style={{
                    WebkitTextStroke: "3px #facc15"
                  }}
                > {age}</span>
              </span>
            </div>

            {/* Phone Frame */}
            <div className="relative w-full max-w-sm aspect-[9/16] rounded-[3.5rem] border-[3px] border-yellow-400/80 overflow-hidden shadow-2xl ">
              <img src={user?.displayPictureUrl || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop"} className="w-full h-full object-cover" alt="Profile" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-6 ">
                {/* Zodiac Symbol */}
                <div className="absolute right-10 bottom-32 -translate-y-1/2 flex flex-col items-center gap-1">
                  <span className="text-4xl filter drop-shadow-lg">{zodiac.symbol}</span>
                  <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80">{zodiac.name}</span>
                </div>

                {/* Quote Box */}
                <div className="mx-auto mb-6 w-[90%] px-5 py-6 text-center relative border border-2 border-white/40 rounded-[1rem]">
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white/40 text-5xl font-serif">“</span>
                  <p className="text-xs font-medium leading-relaxed tracking-wide italic">
                    {user?.intent || "Here to meet strangers and here to meet strangers and overthink later."}
                  </p>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/40 text-5xl font-serif rotate-180">“</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center w-full text-center animate-fade-in border-2 border-white/40 h-[100vh] rounded-[3.5rem]">
        <div className="flex flex-col items-center justify-center p-12 text-center ">
           <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Meet your Facecard</h1>
           <p className="max-w-md text-white/90 leading-relaxed mb-16 text-base font-medium">
             This is what people see before meeting you.<br/>
             Adding more details makes it cooler and gets you<br/>
             better matches & conversations.
           </p>

           <div className="space-y-6 w-full max-w-sm">
             <button 
               onClick={() => setView('editor')}
               className="w-full py-4 border-2 border-white/30 border-b-4 rounded-2xl text-xl font-semibold hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all duration-300 transform active:scale-95 shadow-xl"
             >
               Make my Facecard cooler 😤
             </button>

              <button 
                onClick={() => router.push('/')}
                className="w-full text-white text-sm font-medium flex items-center justify-center gap-2 hover:text-white transition-colors"
              >
                I'll do it later 🥱
              </button>
           </div>
        </div>
      </section>

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
