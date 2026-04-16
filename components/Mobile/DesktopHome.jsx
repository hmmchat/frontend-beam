"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import SignUpModal from "@/components/auth/SignUpModal";
import GenderModal from "@/components/modals/GenderModal";
import LocationModal from "@/components/modals/LocationModal";
import { IoIosInformationCircleOutline, IoMdClose } from "react-icons/io";
import Button from "@/components/ui/Button";
import { API, apiRequest } from "@/lib/api";
import Link from "next/link";

export default function DesktopHome() {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(
          () => null,
        );
        if (res && typeof res.count === "number") {
          setActiveMeetingCount(res.count);
        }
      } catch (e) {
        // silent failure
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen ">
      {/* Header */}

      {/* Main Layout */}
      <main className="grid grid-cols-1 md:grid-cols-2 h-screen">
        {/* LEFT SIDE */}
        <div className="relative flex items-center justify-center px-6 py-16 md:py-20 lg:py-0 overflow-hidden bg-gradient-purple-dark  ">
          {/* Background Image with Opacity */}

          <div
            className="absolute inset-0 z-0 "
            style={{
              backgroundImage: "url(/assets/mb.jpg)",
              backgroundRepeat: "repeat",
              backgroundSize: "cover",
            }}
          />

          <div className="rounded-[60px] border-2 border-white/30 z-10 w-full h-[96vh] justify-center items-center flex">
            <div className="z-10 text-center max-w-lg p-2">
              <img src="/LOGO.png" className="md:w-64 mx-auto w-44 sm:w-5" />

              <p className="text-white text-xl font-otomanopee">
                Meet someone here,
              </p>

              <div className="inline-flex gap-2 mt-3">
                <img
                  src="/assets/video-on.svg"
                  alt=""
                  className="w-4 h-4 opacity-0 hover:opacity-100"
                />
                <img
                  src="/assets/video-off.svg"
                  alt=""
                  className="w-4 h-4 opacity-100 hover:opacity-0"
                />

                <p className="text-sm font-outfit ">
                  {activeMeetingCount !== null
                    ? activeMeetingCount.toLocaleString()
                    : "0"}{" "}
                  meeting now
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative flex items-center justify-center px-6  py-16 md:py-20 overflow-hidden ">
          <div
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className="absolute top-10 right-12 z-[60] 0  meeting now active:scale-90 transition-transform"
          >
            {isInfoOpen ? (
              <IoMdClose className="w-[3rem] h-[3rem] text-white border rounded-full p-2" />
            ) : (
              <IoIosInformationCircleOutline className="w-[3rem] h-[3rem] text-white opacity-70 border rounded-full p-2 stroke-[10px]" />
            )}
          </div>

          {isInfoOpen && (
            <div className="absolute top-24 z-20 inset-x-26 bottom-38 z-50 bg-black/10 backdrop-blur-xs flex flex-col items-center py-12 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300 rounded-[2.25rem] border border-[1px] border-white/70">
              {/* Decorative Side Brackets */}
              <div className="absolute right-0 top-1/4 h-[174px] w-[18px] border-[1px] border-white/70 border-r-0 rounded-l-xl  pointer-events-none" />
              <div className="absolute right-0 top-[26%] h-[158px] w-[13px] border-[1px] border-white/70 border-r-0 rounded-l-xl  pointer-events-none" />

              <div className="w-full flex overflow-y-scroll justify-center opacity-80 px-10 custom-scroll">
                <div className="text-white text-[14px] font-normal font-[Outfit] leading-relaxed text-left  pb-10 space-y-6">
                  <p>
                    {" "}
                    Every night, when the day is done and you slip into bed —
                    something small happens.
                  </p>{" "}
                  <p>
                    {" "}
                    A portal opens. Right there, beneath you. Quiet. Almost shy
                    about it.{" "}
                  </p>{" "}
                  <p>
                    It leads somewhere uncanny, surreal, liminal — not on any
                    map, not because it's lost or hidden, but because no one
                    ever thought to write it down. Pressed right up against
                    Earth but never part of it. The only way in is through.{" "}
                  </p>
                  <p>Here, no one can see anyone.</p>
                  <p>
                    {" "}
                    You walk, you feel bodies move past you, air shifting,
                    presence everywhere — but no faces, no eyes, nothing. Total
                    invisibility. You could do the most unhinged thing you've
                    ever wanted — and nobody bats an eye, because nobody sees a
                    thing.{" "}
                  </p>
                  <p>
                    Scattered across are television booths. Like old payphones,
                    standing alone, in clusters, facing nothing in particular.
                    No logic to where they are. They just are. Walk up to one
                    and the screen blinks on. On the other side, someone is
                    standing there too. Not fully clear — just an image. A
                    beautiful silhouette. You touch the screen.{" "}
                  </p>{" "}
                  <p>They touch the screen.</p>
                  <p>
                    And then — the place shifts. Like it exhaled. The silhouette
                    bleeds into color, into edges, into a person standing right
                    there in front of you, real and ridiculous and alive. Two
                    strangers, visible only to each other, in all that vastness.
                  </p>
                  <p>
                    {" "}
                    You wander. You talk or you don't. You find a river and sit
                    by it for what feels like years. Time moves differently here
                    — or maybe it doesn't move at all.
                  </p>
                  <p> It all feels like a dream.</p>
                  <p> It probably is. </p>
                  <p> And yet — here you are again.</p>
                  <p> The screen, glowing.</p>
                  <p> The silhouette on the other side.</p>
                  <p> Again.</p>
                </div>
              </div>
            </div>
          )}
          {/* Background */}
          <div
            className="absolute inset-0 z-[1] opacity-70 mix-blend-hard-light md:animate-zoom-slow"
            style={{
              backgroundImage: "url(/bg.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "repeat",
            }}
          />

          {/* Top Icons */}

          <div className="rounded-[60px] border-2 border-white/30 z-10 w-full h-[96vh] justify-center items-center flex">
            {/* Pattern */}

            {/* Action Card */}
            <div className="relative z-[2] w-full flex flex-col h-full px-8">
              {/* CENTER CTA */}
              <div className="flex-1 flex items-center justify-center mt-40">
                <button
                  className=" w-[85%] border-2 py-7 bg-black/30 text-white border-white/80 rounded-[1.3rem] border-b-4 flex items-center justify-center gap-3"
                  onClick={() => setIsSignUpOpen(true)}
                >
                  <img
                    src="/assets/video-on.svg"
                    className="w-8 h-8 opacity-70"
                  />
                  Meet that someone
                </button>
              </div>

              {/* BOTTOM SECTION */}
              <div className="mb-10 flex justify-between items-center ">
                <div className="border p-3 rounded-full flex items-center justify-center border-b-4">
                  <Link href="/beam-tv">
                    <button className="relative h-10 w-10 l p-3  shadow-md hover:border-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 active:border-b-2 ">
                      {/* TV Frame (background) */}
                      <img
                        src="/tvfame.png"
                        className="absolute inset-0 w-full h-full object-contain  "
                      />

                      {/* Beam TV inside frame */}
                      <img
                        src="/beamtv.png"
                        className="absolute inset-0 m-auto w-6 h-6 object-contain ml-1 mt-3"
                      />
                    </button>
                  </Link>
                </div>
                <button
                  className="rounded-full border-2 border-b-4 border-white/80 py-3 px-10  hover:border-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 active:border-b-2"
                  onClick={() => setIsSignUpOpen(true)}
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />
      <GenderModal
        isOpen={isGenderModalOpen}
        onClose={() => setIsGenderModalOpen(false)}
      />
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}
