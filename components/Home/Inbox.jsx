"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IoChevronBack,
  IoVideocamOutline,
  IoSendSharp
} from "react-icons/io5";
import { FaArrowLeftLong, FaEnvelope, FaEye, FaGift, FaHeart, FaSearchengin  } from "react-icons/fa6";
import { TiUserAdd } from "react-icons/ti";
import Button from "../ui/Button";
import { API } from "../../lib/api";

export default function Inbox() {
  const router = useRouter();
  const [activeChat, setActiveChat] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [view, setView] = useState("inbox"); // inbox | wall
  
  // Dynamic data from backend
  const [inboxConversations, setInboxConversations] = useState([]);
  const [requestConversations, setRequestConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendsWall, setFriendsWall] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const scrollRef = useRef(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [activeTab]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.conversationId);
    }
  }, [activeChat]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('❌ No access token found! User needs to login.');
        router.push('/');
        return;
      }

      console.log('🔑 Token found, fetching conversations...');
      
      const endpoint = activeTab === "inbox" 
        ? API.FRIENDS.GET_INBOX_CONVERSATIONS
        : API.FRIENDS.GET_RECEIVED_REQUESTS;

      console.log('📡 Fetching from:', endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversations loaded:', data);
        
        // Extract userId from token if not set
        if (!currentUserId && token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.sub || payload.uid || payload.id;
            setCurrentUserId(userId);
            if (userId) localStorage.setItem('userId', userId);
          } catch (e) {
            console.error('Failed to parse token payload:', e);
            // Fallback to localStorage if parsing fails
            setCurrentUserId(localStorage.getItem('userId'));
          }
        }
        
        if (activeTab === "inbox") {
          setInboxConversations(data.conversations || []);
        } else {
          setRequestConversations(data.conversations || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch conversations:', response.status);
        console.error('❌ Error details:', errorData);
        
        // Handle 401 Unauthorized (Expired Session)
        if (response.status === 401) {
          console.warn('⚠️ Session expired. Redirecting to login...');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          router.push('/');
          return;
        }

        // Set empty arrays on other errors to show "No conversations" message
        if (activeTab === "inbox") {
          setInboxConversations([]);
        } else {
          setRequestConversations([]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Set empty arrays on error
      if (activeTab === "inbox") {
        setInboxConversations([]);
      } else {
        setRequestConversations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    if (!conversationId) {
      console.warn('⚠️ No conversationId provided to fetchMessages');
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(API.FRIENDS.GET_CONVERSATION_MESSAGES(conversationId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Messages loaded:', data);
        setMessages(data.messages || []);
      } else {
        console.error('❌ Failed to fetch messages:', response.status);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchFriendsWall = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(API.FRIENDS.GET_FRIENDS_WALL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Friends wall loaded:', data);
        setFriendsWall(data.friendsWall || []);
      } else {
        console.error('❌ Failed to fetch friends wall:', response.status);
      }
    } catch (error) {
      console.error('Error fetching friends wall:', error);
    }
  };

  const sendMessage = async () => {
    if (!activeChat || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      const token = localStorage.getItem('accessToken');
      const conversationId = activeChat.conversationId;

      const response = await fetch(API.FRIENDS.SEND_MESSAGE(conversationId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNewMessage("");
        // Optimistically add message or re-fetch
        fetchMessages(conversationId);
      } else {
        console.error('❌ Failed to send message:', response.status);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const currentConversations = activeTab === "inbox" ? inboxConversations : requestConversations;

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
        <div className={`flex items-center justify-between gap-3 text-xl md:text-3xl font-semibold p-4 md:p-0 md:mb-4 ${activeChat ? 'md:flex hidden' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <div className=" border-white border-1 rounded-full p-2" onClick={() => router.push('/')}>
              <FaArrowLeftLong className="text-xl md:text-xl cursor-pointer" />
            </div>
            <span className="text-sm">Messages</span>
          </div>
          <button 
            onClick={() => {
              fetchFriendsWall();
              router.push('/inbox/friends-wall');
            }}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 border border-white/80 px-4 py-1.5 rounded-full text-sm backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            <span className="grid place-items-center w-6 h-6 text-[10px]"><img src="./wall.svg" alt="wall" /></span>
            Friend Wall
          </button>
          <img src="./LOGO.png" alt="Logo" className="w-24 md:w-32" />
        </div>


        {/* Main Card */}
        <div className="flex-1 w-full md:h-[78vh] rounded-[48px] 
          ring-2 ring-white/50 ring-offset-2 ring-offset-purple-900/90
          overflow-hidden flex flex-col md:flex-row bg-transparent">


          {/* CHAT LIST */}
          <div
            className={` md:w-[40%] w-full  md:p-6 p-4
            ${activeChat ? "hidden md:flex" : "flex"} flex-col`}
          >


            {/* Tabs */}
            <div className="w-full py-6 text-white space-y-4">
              <div className="flex items-center justify-between border border-white/30 rounded-full px-3 py-2">
                <button className="w-10 h-10 flex items-center justify-center border border-white/30 rounded-full">
                  <FaSearchengin className="text-lg" />
                </button>

                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`px-4 py-1 rounded-full text-sm ${
                    activeTab === "inbox"
                      ? "bg-white/20 border border-white"
                      : "border border-transparent"
                  }`}
                >
                  Inbox
                </button>

                <button
                  onClick={() => setActiveTab("requests")}
                  className={`px-5 py-1 rounded-full text-sm ${
                    activeTab === "requests"
                      ? "bg-white/20 border border-white"
                      : "border border-transparent "
                  }`}
                >
                  Requests <span className="text-xs font-thin">({requestConversations.length})</span>
                </button>
              </div>

              <div className="flex items-center justify-between ">
                <button className="flex items-center  border border-white/90 rounded-full p-3 gap-2">
                  <FaEye className="text-lg" />
                  <p className="text-[10px] font-thin text-white">Sent Requests</p>
                </button>

                <div className="flex gap-2 ">
                  <div className="border border-white/30 rounded-full p-3">
                    <button className="w-4 h-4 flex items-center justify-center border border-white/30 rounded-full ">
                      <FaGift className="text-xl" /> 
                    </button>
                  </div>
                  <div className="border border-white/30 rounded-full p-3">
                    <button className="w-4 h-4 flex items-center justify-center border border-white/30 rounded-full">
                      <FaEnvelope className="text-xl" />
                    </button>
                  </div>
                  <div className="border border-white/30 rounded-full p-3">
                    <button className="w-4 h-4 flex items-center justify-center border border-white/30 rounded-full">
                      <FaHeart className="text-xl" />
                    </button>
                  </div>
                </div>
              </div>
            </div>


        
            <div className="border border-white/50 rounded-3xl p-6 flex-1 flex flex-col overflow-hidden">

              {/* Loading State */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/60">Loading conversations...</p>
                </div>
              ) : (
                <>
                  {/* Chat List */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-4 md:px-0">
                    {currentConversations.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-white/60">No conversations yet</p>
                      </div>
                    ) : (
                      currentConversations.map((conversation, i) => (
                        <button
                          key={conversation.conversationId || i}
                          onClick={() => setActiveChat(conversation)}
                          className="flex items-center gap-4 border-b border-white/20 pb-3 text-left"
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <Image 
                              src={conversation.otherUser?.displayPictureUrl || "/assets/ico.png"} 
                              alt={conversation.otherUser?.username || "User"} 
                              fill 
                              className="object-cover"
                            />
                          </div>

                          <div className="flex-1">
                            <div className="font-medium text-base">{conversation.otherUser?.username || "Unknown User"}</div>
                            <div className="text-sm text-white/70 truncate font-light">
                              {conversation.lastMessage?.text || "No messages yet"}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

            </div>

          </div>

          {/* Vertical Divider */}
          <div className="hidden md:block w-px bg-white/20"></div>

          {/* CHAT VIEW */}
          <div
            className={`md:w-[60%] w-full h-full flex flex-col
            ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {activeChat ? (
              <>
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
                      <Image 
                        src={activeChat.otherUser?.displayPictureUrl || "/assets/ico.png"} 
                        alt="User" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <span className="font-semibold text-lg">{activeChat.otherUser?.username || "User"}</span>
                  </div>

                  <img src="/assets/Video-on.svg" alt="Video" className="w-10 h-10 opacity-70 m-2" />
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex flex-col gap-4">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-20">
                        <p className="text-white/40 italic">No messages yet</p>
                      </div>
                    ) : (
                      messages.map((message, i) => {
                        const isMe = message.fromUserId === currentUserId;
                        return (
                          <div key={i} className={`flex items-start gap-2 ${isMe ? 'justify-end' : ''}`}>
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/20">
                                <Image 
                                  src={activeChat.otherUser?.displayPictureUrl || "/assets/ico.png"} 
                                  alt="User" 
                                  width={32} 
                                  height={32} 
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-[15px] max-w-[75%] shadow-md whitespace-pre-wrap break-words ${
                              isMe 
                                ? 'bg-gradient-to-br from-[#d91e82] to-[#8a1352] text-white rounded-tr-none border border-white/10' 
                                : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                            }`}>
                              {message.message}
                            </div>
                            {isMe && (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/30">
                                <Image 
                                  src={localStorage.getItem('displayPictureUrl') || "/assets/avatar1.png"} 
                                  alt="me" 
                                  width={32} 
                                  height={32} 
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={(el) => (scrollRef.current = el)} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 flex items-center gap-3">
                  {/* Input Wrapper */}
                  <div className="relative flex-1">
                    <input
                      placeholder="Type Message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') sendMessage();
                      }}
                      disabled={sending}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/20 rounded-[32px] md:rounded-full py-3 md:py-4 px-6 pr-14 text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all shadow-inner"
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80 transition-colors disabled:opacity-30"
                    >
                      <IoSendSharp className="text-xl md:text-2xl" />
                    </button>
                  </div>

                  {/* Gift Button */}
                  <button className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[#d91e82] to-[#8a1352] border-4 border-[#ff3db2]/30 shadow-lg shadow-pink-900/40 active:scale-95 transition-transform">
                    <FaGift className="text-xl md:text-2xl text-white" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/60">Select a conversation to start messaging</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
