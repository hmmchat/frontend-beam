'use client';

import FaceCard from '@/components/Home/FaceCard';

export default function FacecardDisplay({ user, age, setView, router }) {
  return (
    <div
      className="flex min-h-screen w-full flex-col overflow-hidden bg-purple-950 text-white outfit-font"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 px-3 py-3 
                      sm:px-4 md:flex-row md:gap-4 md:px-6 lg:gap-6 xl:gap-10">

        {/* LEFT */}
        <div className="flex flex-1 flex-col items-center justify-center 
                        overflow-hidden md:overflow-visible
                        rounded-[2rem] 
                        md:border md:border-white/30 md:rounded-[2.5rem] 
                        lg:rounded-[3rem] px-3 py-3 sm:px-4">

          <div className="flex w-full flex-col items-center justify-center text-center ">

            <p className="text-base sm:text-lg md:text-sm lg:text-base ">
              This is Your FaceCard
            </p>

            <p className="text-[10px] sm:text-xs md:text-[11px]  font-thin mb-4">
              People will see this before meeting you <br />
              You can add more info to get better matches
            </p>

            {/* CARD */}
            <div className="flex w-full justify-center mt-2 sm:mt-3 md:mt-2">

              <div
                className="
                  transition-all duration-300 ease-in-out

                  scale-[0.85]

                  sm:scale-[0.9]

                  md:scale-[0.8]

                  lg:scale-[0.9]

                  xl:scale-100

                  [@media(max-height:700px)]:scale-[0.7]
                  [@media(max-height:600px)]:scale-[0.6]

                  flex items-center justify-center
                  max-h-[calc(100vh-120px)]
                "
              >
                <div className="flex justify-center">
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

            {/* MOBILE BUTTONS */}
            <div className="flex w-full justify-between gap-4 px-2 mt-4 md:hidden">
              <button
                onClick={() => router.push('/')}
                className="flex-1 rounded-full border border-white/30 py-2 text-xs sm:text-sm font-semibold transition hover:bg-yellow-400 hover:text-black"
              >
                Later 🥱
              </button>

              <button
                onClick={() => setView('editor')}
                className="flex-1 rounded-full border border-white/30 py-2 text-xs sm:text-sm font-semibold transition hover:bg-yellow-400 hover:text-black"
              >
                Add Info 😤
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center 
                        rounded-[2rem] border border-white/30 
                        px-4 py-5 
                        lg:px-6 lg:py-6 xl:px-10">

          <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold">
            Meet your Facecard
          </h1>

          <p className="mt-3 max-w-md text-xs md:text-sm lg:text-base text-white/90">
            This is what people see before meeting you.
            <br />
            Adding more details makes it cooler and gets you better matches.
          </p>

          <div className="w-full max-w-sm mt-4 space-y-3 lg:space-y-4">

            <button
              onClick={() => setView('editor')}
              className="w-full rounded-xl border border-white/30 py-3 text-sm md:text-base lg:text-lg font-semibold transition hover:bg-yellow-400 hover:text-black"
            >
              Make it cooler 😤
            </button>

            <button
              onClick={() => router.push('/')}
              className="text-xs md:text-sm text-white/80 hover:text-white"
            >
              I’ll do it later 🥱
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}