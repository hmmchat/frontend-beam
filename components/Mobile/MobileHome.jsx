"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import SignUpModal from "@/components/auth/SignUpModal";
import Button from "@/components/ui/Button";
import MeetLogo from "@/components/ui/MeetLogo";
import { API, apiRequest } from "@/lib/api";
import Link from "next/link";
import clsx from 'clsx';

import { IoIosInformationCircleOutline, IoMdClose } from "react-icons/io";
import MeetNowButton from "@/components/ui/MeetNowButton";
import BeamColourLogo from "@/components/ui/BeamColourLogo";

export default function Home(


) {


  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [isVideoOn, setIsVideoOn] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(
          () => null,
        );
        if (res && typeof res.count === "number") {
          setActiveMeetingCount(res.count);
        }
      } catch (e) { }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col">
      {/* 🔥 FULL SCREEN BACKGROUND */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-hard-light"
        style={{
          backgroundImage: "url(/bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "15% center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* 🔥 OPTIONAL DARK OVERLAY */}
      <div className="absolute inset-0 z-[1]" />

      {/* 🔥 CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 🔥 MAIN BOX (ROUNDED BORDER) */}
        <div
          className={`w-[96vw] mt-3 mx-auto flex-1 rounded-4xl overflow-hidden flex items-center justify-center transition-all duration-300 ${!isInfoOpen ? "border border-[1px] border-white/30" : "border-none"}`}
        >

          <div className="flex w-full flex-col items-center justify-center h-full text-center px-4 relative">
            <div
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className="absolute top-6 right-6 z-[60]   meeting now active:scale-90 transition-transform"
            >
              {isInfoOpen ? (
                <IoMdClose className="w-[2.5rem] h-[2.5rem] text-white border rounded-full p-2" />
              ) : (
                <IoIosInformationCircleOutline className="w-[2.5rem] h-[2.5rem] text-white  border border-white/50  rounded-full p-2 stroke-[10px]" />
              )}
            </div>

            {isInfoOpen && (
              <div className="absolute top-24 z-20 inset-x-0 bottom-8 z-50 bg-black/10 backdrop-blur-xs flex flex-col items-center pt-[70px] pb-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 rounded-[2.25rem] border border-[1px] border-white/70">
                {/* Decorative Side Brackets */}
                <div className="absolute right-0 top-1/4 h-[174px] w-[18px] border-[1px] border-white/70 border-r-0 rounded-l-xl pointer-events-none" />
                <div className="absolute right-0 top-[26%] h-[158px] w-[13px] border-[1px] border-white/70 border-r-0 rounded-l-xl pointer-events-none" />

                <div className="flex flex-col items-center justify-center shrink-0 mb-4">
                  <BeamColourLogo alt="beam" className="w-[129px] mx-auto" />
                  <p className="text-white text-[12px] font-[family-name:var(--font-otomanopee)] text-center -mt-3">
                    Meet Someone here
                  </p>
                </div>

                <div className="w-full flex-1 min-h-0 flex overflow-y-auto justify-center opacity-80 px-8 custom-scroll">
                  <div className="text-white text-[14px] font-normal font-[family-name:var(--font-outfit)] leading-normal text-center max-w-[287px] pb-6 space-y-4">
                    <p>
                      Beam is the liminal corner of the internet. A place
                      between awake and asleep. It&apos;s dreamy here. It&apos;s
                      not listed on any map. This website is the only known way
                      in.
                    </p>
                    <p>
                      You&apos;ll only find real people here. You can&apos;t
                      always tell, though. You&apos;re a projection too. Just
                      like everyone else.
                    </p>
                    <p>
                      Come here if you feel like talking about something, just
                      to see what happens next.
                    </p>
                    <p className="text-[10px] pt-2">
                      — Beam Serendipity Labs
                      <br />
                      © 2026 Beam
                    </p>
                  </div>
                </div>

                <p className="shrink-0 text-white/80 text-[10px] font-[family-name:var(--font-outfit)] underline underline-offset-2 pt-3">
                  How to use Beam?
                </p>
              </div>
            )}

            <MeetLogo
              activeCount={activeMeetingCount}
              className={`absolute bottom-[71%] left-1/2 -translate-x-1/2 transition-opacity duration-300 ${isInfoOpen ? "opacity-0" : "opacity-100"}`}
            />

            <div
              className={`absolute bottom-[25%] sm:bottom-[20%] left-1/2 -translate-x-1/2 z-40 pointer-events-none w-full max-w-[520px] px-3 sm:px-4 transition-opacity duration-300 ${isInfoOpen ? "opacity-0" : "opacity-100"}`}
            >
              <div className="w-full pointer-events-auto flex justify-center">
                <MeetNowButton
                  onClick={() => setIsSignUpOpen(true)}
                  isVideoOn={isVideoOn}
                  onVideoClick={() => setIsVideoOn(!isVideoOn)}
                  className="w-[clamp(300px,85vw,520px)] aspect-[23/5]"
                  iconClass="transition-all w-[clamp(25px,6.5vw,36px)] h-[clamp(25px,6.5vw,36px)] md:w-8 md:h-8"
                  borderClass="border border-b-[3px] md:border-b-[5px] md:border-[1.89px] rounded-[16px] md:rounded-[26px]"
                />
              </div>
            </div>
          </div>
        </div>







        {/* 🔥 BOTTOM BAR (NOW HAS BG BEHIND IT) */}
        <div className="w-full flex items-center justify-between px-4 py-4">

          <div className="border border-white/50 p-3 rounded-full flex items-center justify-center border-b-[3px]  hover:scale-110 active:scale-95 active:border-b-2 transition-all duration-300">
            <Link href="/beam-tv">
              <button className="relative h-8 w-8 l p-3 shadow-md hover:border-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                {/* TV Frame (background) */}
                <img
                  src="/tvfame.png"
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Beam TV inside frame */}
                <img
                  src="/beamtv.png"
                  className="absolute inset-0 m-auto w-5 h-5 object-contain ml-1 mt-2"
                />
              </button>
            </Link>

          </div>

          <button
            className="border text-[12px] border-white/50 border-b-[3px] text-white px-6 py-4 rounded-full font-[family-name:var(--font-otomanopee)]"
            onClick={() => setIsSignUpOpen(true)}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* MODAL */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />
    </div>
  );
}
