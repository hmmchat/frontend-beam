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
import MeetNowButton from "@/components/ui/MeetNowButton";
import clsx from 'clsx';
export default function DesktopHome() {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
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
      } catch (e) {
        // silent failure
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={clsx('relative', 'h-screen')}>
      {/* Header */}

      {/* Main Layout */}
      <main className={clsx('grid', 'grid-cols-1', 'md:grid-cols-2', 'h-screen')}>
        {/* LEFT SIDE */}
        <div className={clsx('relative', 'flex', 'items-center', 'justify-center', 'px-4', 'py-16', 'md:py-20', 'lg:py-0', 'overflow-hidden', 'bg-gradient-purple-dark')}>
          {/* Background Image with Opacity */}

          <div
            className={clsx('absolute', 'inset-0', 'z-0')}
            style={{
              backgroundImage: "url(/assets/mb.jpg)",
              backgroundRepeat: "repeat",
              backgroundSize: "cover",
            }}
          />

          <div className={clsx('rounded-[60px]', 'border-2', 'border-white/30', 'z-10', 'w-full', 'h-[96vh]', 'justify-center', 'items-center', 'flex')}>
            <div className={clsx('z-10', 'text-center', 'max-w-lg')}>
              <img src="/LOGO.png" className={clsx('md:w-[230px]', 'mx-auto', 'w-44', 'sm:w-5')} />

              <p className={clsx('text-white', 'text-[20px]', 'font-otomanopee', '-mt-2')}>
                Meet someone here
              </p>

              <div className={clsx('inline-flex', 'gap-2', 'mt-3')}>
               <div
  onClick={() => setIsVideoOn(!isVideoOn)}
  className={clsx('flex', 'items-center', 'gap-2', 'mt-2', 'cursor-pointer', 'select-none')}
>
  <img
    src={isVideoOn ? "/assets/video-on.svg" : "/assets/video-off.svg"}
    alt="video toggle"
    className={clsx('w-5', 'h-5', 'transition-transform', 'duration-200', 'active:scale-90')}
  />

  <p className={clsx('text-sm', 'font-outfit')}>
    {activeMeetingCount !== null
      ? activeMeetingCount.toLocaleString()
      : "0"}{" "}
    meeting now
  </p>
</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className={clsx('relative', 'flex', 'items-center', 'justify-center', 'px-4', 'py-16', 'md:py-20', 'overflow-hidden')}>
          <div
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className={clsx('absolute', 'top-[54px]', 'right-14', 'z-50', 'meeting', 'now', 'active:scale-90', 'transition-transform')}
          >
            {isInfoOpen ? (
              <IoMdClose className={clsx('w-[3rem]', 'h-[3rem]', 'text-white', 'border', 'rounded-full', 'p-2')} />
            ) : (
              <IoIosInformationCircleOutline className={clsx('w-[3rem]', 'h-[3rem]', 'text-white', 'border', 'border-white/50', 'rounded-full', 'p-2', 'stroke-[10px]', 'hover:scale-110', 'ease-in-out')} />
            )}
          </div>

          {isInfoOpen && (
            <div className={clsx('absolute', 'top-24', 'z-20', 'inset-x-26', 'bottom-38', 'z-50', 'bg-black/10', 'backdrop-blur-xs', 'flex', 'flex-col', 'items-center', 'py-12', 'overflow-y-auto', 'animate-in', 'fade-in', 'slide-in-from-top-4', 'duration-300', 'rounded-[2.25rem]', 'border', 'border-[1px]', 'border-white/70')}>
              {/* Decorative Side Brackets */}
              <div className={clsx('absolute', 'right-0', 'top-1/4', 'h-[174px]', 'w-[18px]', 'border-[1px]', 'border-white/70', 'border-r-0', 'rounded-l-xl', 'pointer-events-none')} />
              <div className={clsx('absolute', 'right-0', 'top-[26%]', 'h-[158px]', 'w-[13px]', 'border-[1px]', 'border-white/70', 'border-r-0', 'rounded-l-xl', 'pointer-events-none')} />

              <div className={clsx('w-full', 'flex', 'overflow-y-scroll', 'justify-center', 'opacity-80', 'px-10', 'custom-scroll')}>
                <div className={clsx('text-white', 'text-[14px]', 'font-normal', 'font-[Outfit]', 'leading-relaxed', 'text-left', 'pb-10', 'space-y-6')}>
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
            className={clsx('absolute', 'inset-0', 'z-[1]', 'opacity-70', 'mix-blend-hard-light', 'md:animate-zoom-slow')}
            style={{
              backgroundImage: "url(/bg.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "repeat",
            }}
          />

          {/* Top Icons */}

          <div className={clsx('rounded-[60px]', 'border-2', 'border-white/30', 'z-10', 'w-full', 'h-[96vh]', 'justify-center', 'items-center', 'flex')}>
            {/* Pattern */}

            {/* Action Card */}
            <div className={clsx('relative', 'z-[2]', 'w-full', 'flex', 'flex-col', 'h-full', 'px-8')}>
              {/* CENTER CTA */}
              <div className={clsx('flex-1', 'flex', 'items-center', 'justify-center', 'mt-44')}>
                <MeetNowButton
                  className={clsx('w-[90%]', 'py-8')}
                  onClick={() => setIsSignUpOpen(true)}
                  isVideoOn={isVideoOn}
                  onVideoClick={() => setIsVideoOn(!isVideoOn)}
                />
              </div>

              {/* BOTTOM SECTION */}
              <div className={clsx('mb-10', 'flex', 'justify-between', 'items-center', 'px-2')}>
                <div className={clsx('border-2', 'border-white/50', 'p-3', 'rounded-full', 'flex', 'items-center', 'justify-center', 'border-b-4' ,  'hover:scale-110','active:scale-95', 'active:border-b-2', 'transition-all', 'duration-300' )}>
                  <Link href="/beam-tv">
                    <button className={clsx('relative', 'h-10', 'w-10', 'l', 'p-3', 'shadow-md', 'hover:border-white','hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]', )}>
                      {/* TV Frame (background) */}
                      <img
                        src="/tvfame.png"
                        className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'object-contain')}
                      />

                      {/* Beam TV inside frame */}
                      <img
                        src="/beamtv.png"
                        className={clsx('absolute', 'inset-0', 'm-auto', 'w-6', 'h-6', 'object-contain', 'ml-1', 'mt-3')}
                      />
                    </button>
                  </Link>
                </div>
                <button
                  className={clsx('rounded-full', 'border-2', 'text-sm', 'border-b-4', 'border-white/40', 'py-4', 'px-10', 'hover:border-white', 'hover:scale-105', 'hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]', 'active:scale-95', 'active:border-b-2', 'transition-all', 'duration-300')}
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
