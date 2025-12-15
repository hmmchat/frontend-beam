"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IoChevronBack,
  IoVideocamOutline,
} from "react-icons/io5";

export default function Inbox() {
  const [activeChat, setActiveChat] = useState(null);

  const chats = [
    "Richa",
    "Shreyaa",
    "Pookie Gang",
    "Pookie Gang",
    "Pookie Gang",
  ];

  return (
    <div className="h-screen w-full relative text-white font-sans overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/assets/1.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      />

      {/* Logo */}


      {/* Page Container */}
      <div className="pt-16 md:pt-24 px-4 md:px-12 lg:px-24 flex flex-col">

        {/* Title */}
        <div className="flex items-center justify-between gap-3 text-2xl md:text-3xl font-semibold mb-4">
          <div className="flex items-center gap-3">
            <IoChevronBack className="text-2xl md:text-3xl" />
            <span>Inbox</span>
          </div>
          <img src="/assets/Logo.svg" alt="Logo" className="w-24 md:w-auto" />
        </div>
        {/* <div className="absolute top-4 right-4 md:top-6 md:right-10 z-10">
        
        </div> */}

        {/* Main Card */}
        <div variant="outline" className="w-full md:h-[70vh] border border-white/20 rounded-2xl md:rounded-3xl backdrop-blur-sm overflow-hidden flex flex-col md:flex-row">

          {/* CHAT LIST */}
          <div
            className={`md:w-[40%] w-full p-4 md:p-6 border-white/20 
            ${activeChat ? "hidden md:flex" : "flex"} flex-col`}
          >
            <h2 className="text-lg md:text-xl font-semibold mb-4">Chats</h2>

            {/* Tabs */}
            <div className="flex gap-6 text-sm mb-4">
              <button className="font-semibold border-b-2 border-white pb-1">
                Friends
              </button>
              <button className="text-white/70 relative">
                Requests
                <span className="absolute -right-3 -top-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
              </button>
            </div>

            {/* Search */}
            <input
              placeholder="Search"
              className="mb-4 w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm placeholder-white/50"
            />

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4">
              {chats.map((name, i) => (
                <button
                  key={i}
                  onClick={() => setActiveChat(name)}
                  className="flex items-center gap-4 border-b border-white/10 pb-3 text-left"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image src="/avatar1.jpg" alt={name} fill />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border border-purple-900" />
                  </div>

                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-white/60 truncate w-40">
                      Type psum dolor sit amet…
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CHAT VIEW */}
          <div
            className={`md:w-[60%] w-full flex flex-col
            ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChat(null)}
                  className="md:hidden text-xl"
                >
                  <IoChevronBack />
                </button>

                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image src="/avatar1.jpg" alt="User" fill />
                </div>
                <span className="font-semibold">{activeChat}</span>
              </div>

              <IoVideocamOutline className="text-2xl" />
            </div>

            {/* Request Banner */}
            <div className="p-4">
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm">
                <div className="font-medium">Request Sent</div>
                <div className="text-xs text-white/60">
                  User hasn’t accepted yet.
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex justify-end items-end gap-2">
                <div className="bg-purple-900/60 border border-white/10 px-4 py-3 rounded-xl text-sm max-w-[75%]">
                  Lorem ipsum dolor sit amet 👀
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image src="/avatar1.jpg" alt="me" fill />
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/20 relative">
              <input
                disabled
                placeholder="Send a gift to start chatting 🎁"
                className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-sm placeholder-white/40"
              />
              <button className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-pink-500 text-2xl">
                🎁
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
