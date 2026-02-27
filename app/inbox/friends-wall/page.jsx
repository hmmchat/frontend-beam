"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowLeftLong } from "react-icons/fa6";
import { FaShare } from "react-icons/fa";

import { useState, useEffect } from "react";
import { API } from "../../../lib/api";

export default function FriendWall() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(API.FRIENDS.GET_FRIENDS_WALL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        console.error('❌ Failed to fetch wall:', response.status);
      }
    } catch (error) {
      console.error('Error fetching wall:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(API.FRIENDS.GET_FRIENDS_WALL + '/share', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          // Open share link or copy to clipboard
          if (navigator.share) {
            await navigator.share({
              title: 'My HMM Friend Wall',
              text: 'Check out my friends on HMM!',
              url: data.deepLink || data.imageUrl
            });
          } else {
            await navigator.clipboard.writeText(data.deepLink || data.imageUrl);
            alert('Share link copied to clipboard!');
          }
        }
      }
    } catch (error) {
      console.error('Error sharing wall:', error);
    } finally {
      setSharing(false);
    }
  };

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
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 text-xl md:text-3xl font-semibold p-4 md:p-0 md:px-10 md:mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="border-white border-1 rounded-full p-2 hover:bg-white/10 transition-colors"
            >
              <FaArrowLeftLong className="text-xl" />
            </button>
            <span className="text-sm">Friend Wall</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-2 border border-white/80 px-4 py-1.5 rounded-full text-sm backdrop-blur-md hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <FaShare className="text-sm" />
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="flex-1 w-full md:h-[78vh] rounded-[48px] 
          overflow-hidden flex flex-col bg-transparent py-6 px-4 md:p-10 mb-6 md:mb-0">
          
          <div className="flex flex-col h-full">
            {/* Subtitle */}
            <p className="text-base md:text-lg text-white/80 leading-relaxed mb-8 max-w-2xl">
              Once they were drifters now they are your real friend,
              and you are to them as well
            </p>

            {/* Wall Content Container */}
            <div className="flex-1 border border-white/50 rounded-3xl p-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/60">Loading your friends...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="h-full flex items-center justify-center flex-col gap-4">
                    <p className="text-white/60 text-lg">Your wall is empty</p>
                    <p className="text-white/40 text-sm">Make some friends to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                    {friends.map((friend, i) => (
                      <div
                        key={friend.friendId || i}
                        className="aspect-square rounded-xl md:rounded-2xl border border-white/40 overflow-hidden bg-white/5 relative group cursor-pointer hover:border-white/80 transition-all shadow-lg shadow-black/20"
                      >
                        <Image
                          src={friend.photoUrl || "/assets/ico.png"}
                          alt="friend"
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    ))}
                    {/* Fill up with placeholder spots for aesthetics if less than 20 friends */}
                    {friends.length < 20 && Array.from({ length: 20 - friends.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="aspect-square rounded-xl md:rounded-2xl border border-white/10 bg-white/5 opacity-50"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
