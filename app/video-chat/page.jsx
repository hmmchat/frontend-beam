'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IoClose, IoChevronBack, IoChevronForward, IoGiftSharp, IoSettingsSharp } from 'react-icons/io5';
import { MdHome } from 'react-icons/md';
import { BiSkipNext } from 'react-icons/bi';
import { AiOutlineUserAdd } from "react-icons/ai";

export default function VideoChat() {
  const [isLoading, setIsLoading] = useState(true);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedGift, setSelectedGift] = useState(null);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const gifts = [
    { id: 1, name: 'Monkey', price: 50, emoji: '🐵' },
    { id: 2, name: 'Pikachu', price: 250, emoji: '⚡' },
    { id: 3, name: 'Superman', price: 2000, emoji: '🦸' },
    { id: 4, name: 'Iron Man', price: 25000, emoji: '🤖', highlighted: true },
    { id: 5, name: 'Deadpool', price: 100, emoji: '🎭' },
    { id: 6, name: 'Stitch', price: 300, emoji: '👽' },
    { id: 7, name: 'Pink Monster', price: 5000, emoji: '👹' },
    { id: 8, name: 'Doraemon', price: 10000, emoji: '🤖' },
  ];

  const viewers = [
    { name: 'ssssss', avatar: '/assets/ico.png' },
    { name: 'Austin', avatar: '/assets/ico.png' },
    { name: 'Austin', avatar: '/assets/ico.png' },
  ];

  const chatMessages = [
    { user: 'User1', message: 'Lorem ipsum dolor sit amet, consect swdj, duhb Nooooo!' },
    { user: 'User2', message: 'Ut quis urna id ligula Type psum dolor sit amet adipiscing elit.' },
    { user: 'User3', message: 'Lorem ipsum dolor sit amet, consect swdj' },
    { user: 'User4', message: 'Ut quis urna id ligula.... Type psum dolor sit amet adipiscing elit.' },
  ];

  // Loading Screen
  if (isLoading) {
    return (
      <div className="h-screen w-full grid grid-cols-1 md:grid-cols-2">
        {/* Left Side - Loading */}
        <div 
          className="relative flex flex-col items-center justify-center bg-purple-900"
          style={{
            backgroundImage: "url('/assets/mb.jpg')",
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
          }}
        >
          <button className="absolute top-6 right-6 text-white text-3xl hover:bg-white/10 p-2 rounded-full">
            <IoClose />
          </button>

          <div className="flex flex-col items-center gap-6">
            {/* Avatar with border */}
            <div className="relative w-44 h-40 rounded-3xl overflow-hidden">
              <Image src="/loadingpage.png" alt="User" fill />
            </div>

            {/* HMM Logo */}
            <div className="relative w-48 h-24">
              <Image src="/assets/Logo.svg" alt="HMM" fill className="object-contain" />
            </div>

            <p className="text-white text-lg">This might get interesting.</p>

            {/* Loading Spinner */}
            <div className="relative w-16 h-16 mt-40">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>

            <p className="text-white/80 text-sm">Delivering you a human now</p>
          </div>
        </div>

        {/* Right Side - User's Video */}
        <div className="relative bg-gray-800">
          <div className="absolute bottom-4 right-4">
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              Only Solo matches
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Main Video Chat Screen
  return (
    <div className="h-screen w-full grid grid-cols-1 md:grid-cols-2 relative">
      {/* Left Side - Other User's Video */}
      <div 
        className="relative bg-gray-200"
        style={{
          backgroundImage: "url('/assets/image50.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* User Info Top Left */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image src="/assets/ico.png" alt="Sanya" fill className="object-cover" />
              </div>
              <div className="text-white">
                <div className="font-semibold">Sanya, 23</div>
                <div className="text-xs opacity-80">📍 Banglore</div>
              </div>
            </div>
            <button className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
              <AiOutlineUserAdd  className="h-8 w-8 " />
            </button>
          </div>
          
          {/* Certified Baddie Badge */}
          <div className="bg-black/50 rounded-full px-3 py-1 text-white text-xs w-fit">
            🎖️ Certified Baddie
          </div>
        </div>

        {/* Action Buttons Right Side */}
        <div className="absolute top-6 right-6 flex flex-col gap-3">
          <button className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700">
            <MdHome className="text-xl" />
          </button>
          <button className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700">
            ⚙️
          </button>
          <button className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700">
            <BiSkipNext className="text-xl" />
          </button>
        </div>

        {/* Hug Counter Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold">
            52 Hug × 187.2 Hug
          </div>
        </div>

        {/* Chat Bubble */}
        <div className="absolute bottom-40 left-20 bg-black/70 text-white px-4 py-2 rounded-lg text-sm max-w-xs">
          "My pizza fell today"
        </div>

        {/* Ice Breaker Icon */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div className="relative w-16 h-16">
            <Image src="/ice.png" alt="Ice breaker" fill className="object-contain" />
          </div>
        </div>

        {/* HMM Logo Bottom Left */}
        <div className="absolute bottom-6 left-6">
          <div className="relative w-20 h-10">
            <Image src="/hmmtranspartent.png" alt="HMM" fill className="object-contain" />
          </div>
        </div>
      </div>

      {/* Right Side - User's Video */}
      <div className="relative bg-gray-800">
        {/* Chat Messages */}
        <div className="absolute bottom-32 right-6 flex flex-col gap-2 max-w-sm">
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex-shrink-0 flex items-center justify-center text-white text-xs">
                👤
              </div>
              <div className="bg-gray-900/80 text-white px-3 py-2 rounded-lg text-xs max-w-xs">
                {msg.message}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message"
            className="flex-1 bg-gray-700/50 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
          <button className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600">
            GIVE
          </button>
          <button 
            onClick={() => setShowGiftModal(true)}
            className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center text-white hover:bg-pink-700"
          >
            <IoGiftSharp className="text-2xl" />
          </button>
        </div>
      </div>

      {/* Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="relative w-full max-w-4xl rounded-3xl p-8"
            style={{
              backgroundImage: "url('/assets/mb.jpg')",
              backgroundRepeat: 'repeat',
              backgroundSize: 'auto',
              backgroundColor: '#6B21A8',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-white text-2xl font-semibold">
                <IoGiftSharp className="text-3xl" />
                Add Gift
              </div>
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                  <IoChevronBack />
                </button>
                <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                  <IoChevronForward />
                </button>
              </div>
            </div>

            {/* Gift Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {gifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => setSelectedGift(gift.id)}
                  className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${
                    gift.highlighted || selectedGift === gift.id
                      ? 'border-yellow-400 bg-purple-800/50'
                      : 'border-purple-400/50 bg-purple-900/30 hover:bg-purple-800/40'
                  }`}
                >
                  <div className="text-5xl">{gift.emoji}</div>
                  <div className="flex items-center gap-1 text-white">
                    <span className="text-cyan-400">💎</span>
                    <span className="font-semibold">{gift.price}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 mb-6">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-2 h-2 bg-white/30 rounded-full"></div>
              <div className="w-2 h-2 bg-white/30 rounded-full"></div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/20 mb-6"></div>

            {/* Viewers */}
            <div className="flex items-center justify-end gap-4">
              {viewers.map((viewer, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-400">
                    <Image src={viewer.avatar} alt={viewer.name} fill className="object-cover" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-bold">
                      ✓
                    </div>
                  </div>
                  <span className="text-white text-xs">{viewer.name}</span>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowGiftModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
            >
              <IoClose className="text-2xl" />
            </button>
          </div>
        </div>
      )}

      {/* Spend Coins Display */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-purple-900/80 text-white px-4 py-2 rounded-lg">
        <div className="text-xs opacity-80">Spend coins:</div>
        <div className="flex items-center gap-1">
          <span className="text-pink-400">💎</span>
          <span className="font-semibold">10,00,000</span>
        </div>
      </div>
    </div>
  );
}
