"use client";

import { useState } from "react";
import FaceCard from "@/components/Home/FaceCard";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { getFacecardPhotos } from "@/lib/facecard-utils";

export default function FacecardDisplay({ user, age, setView, router }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const allPhotos = getFacecardPhotos(user);

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : allPhotos.length - 1,
    );
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev < allPhotos.length - 1 ? prev + 1 : 0,
    );
  };
  return (
    <div
      className="flex min-h-screen w-full flex-col bg-purple-950 text-white outfit-font"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 px-3 py-3 
                      sm:px-4 md:flex-row md:gap-4 md:px-6 lg:gap-6 xl:gap-10"
      >
        {/* LEFT */}
        <div
          className="flex flex-1 flex-col items-center justify-center md:justify-center
min-h-[100dvh] md:min-h-0
overflow-y-auto md:overflow-visible
                        rounded-[2rem] 
                        md:border md:border-white/30 md:rounded-[2.5rem] 
                        lg:rounded-[3rem] px-3 py-3 sm:px-4"
        >
          <div
            className="flex w-full flex-col items-center text-center gap-6 
                flex-1 justify-center 
                -mt-28 md:mt-0
                scale-[0.85] sm:scale-90 md:scale-100"
          >
            <p className="text-lg font-semibold sm:text-lg md:text-sm lg:text-base  md:hidden -mb-5">
              This is Your FaceCard
            </p>

            <p className="text-[10px] sm:text-xs md:text-[11px]  font-thin mb-4 md:hidden">
              People will see this before meeting you <br />
              You can add more info to get better matches
            </p>

            {/* CARD */}
            <div
              className="
    transition-all duration-300 ease-in-out

    
  "
            >
              <div className="flex justify-center w-full ">
                <div className="w-full    ">
                  <FaceCard
                    user={{
                      ...user,
                      age,
                      city: user?.preferredCity || user?.city,
                    }}
                    currentIndex={currentImageIndex}
                    onIndexChange={setCurrentImageIndex}
                  />
                </div>
              </div>
            </div>

            {/* MOBILE BUTTONS */}
            <div className="flex w-full justify-center gap-4 px-2  md:hidden">
              <button
                onClick={handlePrev}
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:text-white transition active:scale-90"
              >
                <IoIosArrowBack />
              </button>

              {/* Right Button */}

              <button
                onClick={() => router.push("/")}
                className="rounded-full px-6 py-4 text-xs sm:text-sm font-semibold border border-white/30 transition hover:bg-yellow-400 hover:text-black whitespace-nowrap"
              >
                Later 🥱
              </button>

              <button
                onClick={() => setView("editor")}
                className="rounded-full px-6 py-4 text-xs sm:text-sm font-semibold border border-white/30 transition hover:bg-yellow-400 hover:text-black whitespace-nowrap"
              >
                Add Info 😤
              </button>

              <button
                onClick={handleNext}
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:border-white transition active:scale-90"
              >
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center text-center 
                        rounded-[2rem] border border-white/30 
                        px-4 py-5 
                        lg:px-6 lg:py-6 xl:px-10"
        >
          <h1 className="text-center justify-center text-white text-4xl font-normal font-Otomanopee_One">
            Meet your Facecard
          </h1>

          <p className="mt-3 max-w-md text-xs md:text-sm lg:text-xl text-white/90 font-outfit">
            This is what people see before meeting you. Adding more details
            makes it cooler and gets you better matches & conversations.
          </p>

          <div className="w-full max-w-sm mt-4 space-y-3 lg:space-y-4">
            <button
              onClick={() => setView("editor")}
              className="w-full rounded-xl border border-white/30 py-3 text-sm md:text-base lg:text-lg font-semibold transition hover:bg-yellow-400 hover:text-black"
            >
              Make it cooler 😤
            </button>

            <button
              onClick={() => router.push("/")}
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
