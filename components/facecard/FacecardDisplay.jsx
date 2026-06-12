"use client";

import { useState, useEffect } from "react";
import FaceCard from "@/components/Home/FaceCard";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { getFacecardPhotos } from "@/lib/facecard-utils";

export default function FacecardDisplay({ user, age, setView, router }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const allPhotos = getFacecardPhotos(user);



  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const updateScale = () => {
      const height = window.innerHeight;

      const newScale = Math.max(
        0.75,
        Math.min(height / 820, 1)
      );

      const newTranslateY = Math.max(
        -120,
        (height - 820) * 0.3
      ) + 40;

      setScale(newScale);
      setTranslateY(newTranslateY);
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const newScale = Math.max(
        0.7,
        Math.min(window.innerHeight / 850, 1)
      );
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // const handlePrev = (e) => {
  //   e?.stopPropagation();
  //   setCurrentImageIndex((prev) =>
  //     prev > 0 ? prev - 1 : allPhotos.length - 1,
  //   );
  // };

  // const handleNext = (e) => {
  //   e?.stopPropagation();
  //   setCurrentImageIndex((prev) =>
  //     prev < allPhotos.length - 1 ? prev + 1 : 0,
  //   );
  // };

  return (
    <div
      className="flex min-h-screen  w-full flex-col  text-white outfit-font overflow-hidden  "
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        repeat: "repeat"
      }}
    >
      <div
        className=" flex w-full flex-1 flex-col gap-3 px-3 py-3 
                      sm:px-4 md:flex-row md:gap-4 md:px-6 lg:gap-6 xl:gap-10"
      >


        {/* LEFT — phone preview area */}
        <div
          className="flex md:flex-1 flex-col items-center justify-center md:justify-center
                       md:min-h-0
                      md:overflow-visible
                      
                      md:border md:border-white/30 md:rounded-[60px] 
                        sm:px-4 "
        >
          <div
            className="flex w-full flex-col items-center text-center 
                       md:flex-1 justify-center 
                        md:mt-0
                         md:scale-100 justify-between "
          >
            <div >
              <p className="text-lg font-semibold sm:text-lg md:text-sm lg:text-base md:hidden ">
                This is Your FaceCard
              </p>

              <p className="text-[10px] sm:text-[14px] font-outfit md:text-[11px] font-thin  md:hidden">
                People will see this before meeting you <br />
                You can add more info to get better matches
              </p>
            </div>

            {/* CARD */}
            <div
              className="w-full mx-auto flex justify-center"
              style={
                typeof window !== "undefined" && window.innerWidth < 768
                  ? {
                    transform: ` translateY(${translateY}px) scale(${scale})`,
                    transformOrigin: "top center",
                  }
                  : undefined
              }
            >
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

            {/* MOBILE BUTTONS */}

            <div className="flex absolute w-full px-6 justify-center gap-4 mx-auto md:hidden bottom-[1vh]  ">


              <button
                onClick={() => router.replace("/")}
                className="rounded-full w-full px-6 py-4 text-[12px] sm:text-sm  border border-white/30 transition hover:bg-yellow-400 hover:text-black whitespace-nowrap"
              >
                Later 🥱
              </button>

              <button
                onClick={() => setView("editor")}
                className="rounded-full px-6 py-4 w-full text-[12px] sm:text-sm  border border-white/30 transition hover:bg-yellow-400 hover:text-black whitespace-nowrap"
              >
                Add Info More 😤
              </button>


            </div>



          </div>
        </div>

        {/* RIGHT — desktop info panel */}
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center text-center 
                        rounded-[60px] border border-white/30 
                        px-4 py-5 
                        lg:px-6 lg:py-6 xl:px-10"
        >
          <h1 className="text-center justify-center text-white text-[36px] font-normal font-Otomanopee_One">
            Meet your Facecard
          </h1>

          <p className="mt-3 max-w-md font-thin text-xs md:text-[20px] lg:text-xl text-white/90 font-outfit">
            This is what people see before meeting you. Adding more details
            makes it cooler and gets you better matches &amp; conversations.
          </p>

          <div className="w-full max-w-[400px] mt-20 space-y-3 md:space-y-7">
            <button
              onClick={() => setView("editor")}
              className="w-full rounded-[18px] border-[2px] border-white/50 border-b-[4px] md:py-5 py-3 md:px-2 px-6 text-sm md:text-[18px] lg:text-[20px] font-semibold transition hover:bg-yellow-400 hover:text-black"
            >
              Make my Facecard cooler 😤
            </button>

            <button
              onClick={() => router.replace("/")}
              className="text-xs md:text-[18px] text-white/90 hover:text-white"
            >
              I’ll do it later 🥱
            </button>
          </div>
        </div>
      </div>
    </div >
  );
}