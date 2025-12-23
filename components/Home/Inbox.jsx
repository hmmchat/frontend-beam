"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IoChevronBack,
  IoVideocamOutline,
} from "react-icons/io5";
import { TiUserAdd } from "react-icons/ti";
import Button from "../ui/Button";

export default function Inbox() {
  const [activeChat, setActiveChat] = useState(null);

  const chats = [
    "Richa",
    "Shreyaa",
    "Pookie Gang",
    "Pookie Gang",
    "Pookie Gang",
    "Pookie Gang",
    "Pookie Gang",

  ];

  return (
    <div className="h-screen w-full relative text-white font-sans overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0 -z-50"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      />

      {/* Page Container */}
      <div className="h-full flex flex-col md:py-12 md:px-12 lg:px-24 md:max-w-6xl md:mx-auto relative z-10 font-[family-name:var(--font-otomanopee)]">

        {/* Title - Hidden on mobile when chat is active */}
        <div className={`flex items-center justify-between gap-3 text-2xl md:text-3xl font-semibold p-4 md:p-0 md:mb-4 ${activeChat ? 'md:flex hidden' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <IoChevronBack className="text-2xl md:text-3xl" />
            <span>Inbox</span>
          </div>
          <img src="/assets/Logo.svg" alt="Logo" className="w-24 md:w-32" />
        </div>


        {/* Main Card */}
        <div variant="outline" className="flex-1 w-full md:h-[78vh] md:border-2 border-white/50 rounded-2xl md:rounded-[4rem]  overflow-hidden flex flex-col md:flex-row bg-transparent">

          {/* CHAT LIST */}
          <div
            className={` md:w-[40%] w-full h-full md:p-6 p-4 border-white/20 
            ${activeChat ? "hidden md:flex" : "flex"} flex-col`}
          >
            <h2 className="hidden md:block text-lg md:text-xl font-semibold mb-4  p-6">Chats</h2>

            {/* Tabs */}
            <div className="flex gap-20 text-sm mb-4 border-b border-white/20 md:gap-20 justify-center px-4 md:px-0">
              <button className="font-semibold border-b-2 border-white pb-2 px-10 ">
                Friends
              </button>
              <button className="text-white/70 relative pb-2">
                Requests
                <span className="absolute -right-4 top-2 w-2 h-2 bg-yellow-400 rounded-full"></span>
              </button>
            </div>

            {/* Search */}
            <input
              placeholder="Search"
              className="mb-10 mx-4 md:mx-0 w-auto md:w-full bg-black/30 border border-white/50 focus:border-white/50 rounded-2xl px-4 py-3 text-sm placeholder-white/50"
            />

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-4 md:px-0">
              {chats.map((name, i) => (
                <button
                  key={i}
                  onClick={() => setActiveChat(name)}
                  className="flex items-center gap-4 border-b-2 border-white/20 pb-3 text-left"
                >
                  <div className="relative w-12 h-12 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image src="/assets/ico.png" alt={name} fill />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border border-purple-900" />
                  </div>

                  <div className="flex-1">
                    <div className="font-medium text-base">{name}</div>
                    <div className="text-sm text-white/80 truncate outfit-font-light">
                      Type psum dolor sit amet , adipiscing elit.
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden md:block w-px bg-white/20"></div>

          {/* CHAT VIEW */}
          <div
            className={`md:w-[60%] w-full h-full flex flex-col
            ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between md:px-6  md:p-2 md:mt-6 border-b border-white/20 bg-black/20 md:bg-transparent">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChat(null)}
                  className="md:hidden text-2xl"
                >
                  <IoChevronBack />
                </button>

                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image src="/assets/ico.png" alt="User" fill />
                </div>
                <span className="font-semibold text-lg">{activeChat}</span>
              </div>

              {/* <IoVideocamOutline className="text-3xl" /> */}
              <img src="/assets/Video-on.svg" alt="Video" className="w-10 h-10 opacity-70 m-2" />
            </div>

            {/* Conditional Content Based on Active Chat */}
            {activeChat === "Shreyaa" ? (
              <>
                {/* Messages for Shreyaa - Full Conversation */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                  {/* Received Message 1 */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image src="/assets/avatar1.png" alt="Shreyaa" width={32} height={32} />
                    </div>
                    <div className="bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-sm max-w-[75%]">
                      Lorem ipsum dolor sit amet, consect swdj, duhb Nooooo!
                    </div>
                  </div>

                  {/* Sent Message 1 */}
                  <div className="flex justify-end items-start gap-2">
                    <div className="bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-sm max-w-[75%]">
                      Ut quis urna id ligula Type psum dolor sit amet, adipiscing elit.
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image src="/assets/avatar1.png" alt="me" width={32} height={32} />
                    </div>
                  </div>

                  {/* Sent Message 2 */}
                  <div className="flex justify-end items-start">
                    <div className="bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-sm max-w-[75%]">
                      Lorem ipsum dolor sit amet, consect swdj
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image src="/assets/avatar1.png" alt="me" width={32} height={32} />
                    </div>
                  </div>

                  {/* Sent Message 3 with highlight */}
                  <div className="flex justify-end items-start gap-2">
                    <div className="bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-sm max-w-[75%]">
                      <span className="text-yellow-300">Ut quis urna id ligula....</span>
                      <br />
                      Type psum dolor sit amet, adipiscing elit.
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image src="/assets/avatar1.png" alt="me" width={32} height={32} />
                    </div>
                  </div>
                </div>

                {/* Input for Shreyaa */}
                <div className="border-t h-28 border-white/40 relative flex items-center gap-4 px-7">
                  <input
                    placeholder="Type Message"
                    className="flex-1 bg-black/30 border-2 border-white/30 rounded-xl px-6 py-4 text-sm placeholder-white/50 focus:outline-none focus:border-white/50"
                  />

                  {/* Vertical Divider */}
                  <div className="h-full w-px bg-white/30"></div>

                  <button className="relative w-16 h-16 flex items-center justify-center rounded-full bg-pink-700">
                    {/* Circle background */}
                    <Image
                      src="/circle.png"
                      alt="circle"
                      width={64}
                      height={64}
                      className="absolute inset-0"
                    />
                    {/* Gift icon */}
                    <Image
                      src="/giftboc.png"
                      alt="gift"
                      width={32}
                      height={32}
                      className="relative z-10"
                    />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Request Banner for Other Chats */}
                <div className="p-4">
                  <div className="bg-black/20  border border-white/20 rounded-xl p-4 text-sm flex items-center gap-4">

                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <img src="/assets/tiuseradd.svg" alt="" className="w-6 h-6 text-white" />
                      {/* <TiUserAdd className="text-2xl text-white scale-x-[-1] w-6-h-6" /> */}
                    </div>

                    {/* Text Content */}
                    <div>
                      <div className="font-medium">Request Sent</div>
                      <div className="text-md text-white/60 outfit-font1">
                        User hasn't accepted your request yet.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages for Other Chats */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-end">
                  <div className="flex justify-end items-start gap-2">
                    <div className="flex justify-end items-start gap-2">
                      <div className="bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-sm max-w-[75%] outfit-font1">
                        Lorem ipsum dolor sit amet, consect swdj
                      </div>
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        <Image src="/assets/ico.png" alt="me" width={32} height={32} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input for Other Chats */}
                <div className="border-t h-28 border-white/40 relative flex items-center gap-4 px-7">
                  <Button
                    variant="outline2"
                    className="flex-1 px-6 py-4 text-sm focus:outline-none focus:border-white/50 justify-start text-white/50"
                  >
                    Type Message
                  </Button>

                  {/* Vertical Divider */}
                  <div className="h-full w-px bg-white/30"></div>

                  <button className="relative w-14 h-14 flex items-center justify-center rounded-full bg-[#DE008D]">
                    {/* Circle background */}
                    <Image
                      src="/circle.png"
                      alt="circle"
                      width={64}
                      height={64}
                      className="absolute inset-0"
                    />
                    {/* Gift icon */}
                    <Image
                      src="/giftboc.png"
                      alt="gift"
                      width={28}
                      height={28}
                      className="relative z-10"
                    />
                  </button>
                </div>
              </>
            )}


          </div>

        </div>
      </div>
    </div>
  );
}
