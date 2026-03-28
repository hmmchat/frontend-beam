


'use client';

import FaceCard from '@/components/Home/FaceCard';

export default function FacecardDisplay({ user, age, setView, router }) {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-purple-950 text-white outfit-font"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto flex min-h-0 flex-1 flex-col gap-2 px-2 py-2 md:flex-row md:gap-3 md:px-4 md:py-3 max-w-[1200px] w-full">
        {/* Left: facecard */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[2rem] md:border-2  md:border-white/40 md:rounded-[3.5rem] px-2 py-2 md:px-4">
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-0 md:gap-1">
            <p className="shrink-0 text-center text-lg  text-white md:text-xs mt-3">
              This is  Your FaceCard
            </p>
            <p className='md:text-[12px] text-center font-thin text-[10px] '>People will see this before meeting you <br /> You Can add more info to get better matches</p>


            <div className="flex w-full items-center justify-center overflow-hidden py-0">


              <div className="origin-center scale-[0.93] sm:scale-[0.95] md:scale-[0.88] lg:scale-100">

                <div className="w-full max-w-[420px] flex justify-center">
                  <FaceCard
                    user={{
                      ...user,
                      age,
                      city: user?.preferredCity || user?.city,
                    }}
                  />


                </div>
              </div>










            </div>
            <div className="w-full flex shrink-0 space-x-16 md:hidden px-8 mt-0">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-auto px-5  transform rounded-full border border-white/30 py-3 text-sm font-semibold shadow-xl transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-400 hover:text-black active:scale-95 md:py-4 md:text-xl"
              >
                Later 🥱
              </button>


              <button
                type="button"
                onClick={() => setView('editor')}
                className="w-auto px-5 transform rounded-full border border-white/30 py-3 text-sm font-semibold shadow-xl transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-400 hover:text-black active:scale-95 md:py-4 md:text-xl"
              >
                Add More Info 😤
              </button>


            </div>



          </div>

        </div>



        {/* Right: copy + actions */}
        <div className="hidden md:flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-white/40 px-4 py-3 text-center md:rounded-[3.5rem] md:px-8 md:py-6">
          <h1 className="mb-2 shrink-0 text-2xl font-extrabold tracking-tight md:mb-4 md:text-4xl lg:text-5xl">
            Meet your Facecard
          </h1>
          <p className="mb-4 max-w-md shrink-0 text-sm font-medium leading-relaxed text-white/90 md:mb-6 md:text-base">
            This is what people see before meeting you.
            <br className="hidden sm:block" />{' '}
            <span className="sm:inline">
              Adding more details makes it cooler and gets you better matches &amp; conversations.
            </span>
          </p>

          <div className="w-full max-w-sm shrink-0 space-y-3 md:space-y-5">
            <button
              type="button"
              onClick={() => setView('editor')}
              className="w-full transform rounded-2xl border-2 border-b-4 border-white/30 py-3 text-lg font-semibold shadow-xl transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-400 hover:text-black active:scale-95 md:py-4 md:text-xl"
            >
              Make my Facecard cooler 😤
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-white hover:text-white"
            >
              I&apos;ll do it later 🥱
            </button>
          </div>
        </div>



      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
