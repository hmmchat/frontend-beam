"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IoChevronBack,
  IoVideocamOutline,
  IoSendSharp,
  IoLocationOutline
} from "react-icons/io5";
import { FaArrowLeftLong, FaEnvelope, FaEye, FaGift, FaHeart, FaSearchengin  } from "react-icons/fa6";
import { TiUserAdd } from "react-icons/ti";
import Button from "../ui/Button";
import { API } from "../../lib/api";
import GiftModal from "./GiftModal";

export default function Inbox() {
  const router = useRouter();
  const [activeChat, setActiveChat] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [view, setView] = useState("inbox"); // inbox | wall
  
  // Dynamic data from backend
  const [inboxConversations, setInboxConversations] = useState([]);
  const [requestConversations, setRequestConversations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendsWall, setFriendsWall] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  
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
      
      let convEndpoint;
      if (activeTab === "inbox") {
        convEndpoint = API.FRIENDS.GET_INBOX_CONVERSATIONS;
      } else if (activeTab === "requests") {
        convEndpoint = API.FRIENDS.GET_RECEIVED_REQUESTS;
      } else if (activeTab === "sent") {
        convEndpoint = API.FRIENDS.GET_SENT_REQUESTS;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch conversations
      const convResponse = await fetch(convEndpoint, { headers });
      if (convResponse.ok) {
        const convData = await convResponse.json();
        if (activeTab === "inbox") {
          setInboxConversations(convData.conversations || []);
        } else if (activeTab === "requests") {
          setRequestConversations(convData.conversations || []);
        } else if (activeTab === "sent") {
          setRequestConversations(convData.conversations || []); // Use requestConversations state for sent too
        }
      }

      // If in requests tab, also fetch pending friend requests (without conversations yet)
      if (activeTab === "requests") {
        const pendingResponse = await fetch(API.FRIENDS.GET_PENDING_REQUESTS, { headers });
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          
          // Enrich pending requests with user profile info
          const enrichedPending = await Promise.all((pendingData || []).map(async (req) => {
            try {
              const profileResp = await fetch(API.USERS.GET_USER(req.fromUserId), { headers }).then(res => res.json());
              return { ...req, user: profileResp.user || { username: 'Unknown User' } };
            } catch (err) {
              return { ...req, user: { username: 'Unknown User' } };
            }
          }));
          
          setPendingRequests(enrichedPending);

          // Enrich requestConversations with friendRequestId from the same pending data
          setRequestConversations(prev => (prev || []).map(conv => {
            const matchingRequest = (pendingData || []).find(req => req.fromUserId === conv.otherUserId);
            return matchingRequest ? { ...conv, friendRequestId: matchingRequest.id } : conv;
          }));
        }
      }

      // Extract userId from token if not set
      if (!currentUserId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.sub || payload.uid || payload.id;
          setCurrentUserId(userId);
          if (userId) localStorage.setItem('userId', userId);
        } catch (e) {
          console.error('Failed to parse token payload:', e);
          setCurrentUserId(localStorage.getItem('userId'));
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

  const handleAcceptRequest = async (requestId) => {
    if (!requestId) {
      console.error('❌ Cannot accept: requestId is missing');
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      // Strip 'follow_' prefix if present
      const cleanRequestId = typeof requestId === 'string' && requestId.startsWith('follow_') 
        ? requestId.replace('follow_', '') 
        : requestId;
      
      console.log(`[Inbox] Accepting request: ${cleanRequestId} (orig: ${requestId})`);
      
      const response = await fetch(API.FRIENDS.ACCEPT_FRIEND_REQUEST(cleanRequestId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Some backend environments require a body for POST
      });

      if (response.ok) {
        console.log('✅ Friend request accepted');
        fetchConversations();
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error('❌ Failed to accept friend request:', response.status, errData);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!requestId) {
      console.error('❌ Cannot reject: requestId is missing');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      // Strip 'follow_' prefix if present
       const cleanRequestId = typeof requestId === 'string' && requestId.startsWith('follow_') 
        ? requestId.replace('follow_', '') 
        : requestId;

      console.log(`[Inbox] Rejecting request: ${cleanRequestId} (orig: ${requestId})`);

      const response = await fetch(API.FRIENDS.REJECT_FRIEND_REQUEST(cleanRequestId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        console.log('✅ Friend request rejected');
        fetchConversations();
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error('❌ Failed to reject friend request:', response.status, errData);
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const sendMessage = async (giftData = null) => {
    if (!activeChat || sending) return;
    
    // Message is only required if giftData is not provided
    if (!newMessage.trim() && !giftData) return;

    try {
      setSending(true);
      const token = localStorage.getItem('accessToken');
      const conversationId = activeChat.conversationId;

      const body = {
        message: newMessage.trim() || null
      };

      if (giftData) {
        body.giftId = giftData.id;
        body.giftAmount = giftData.price;
      }

      const response = await fetch(API.FRIENDS.SEND_MESSAGE(conversationId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setNewMessage("");
        setIsGiftModalOpen(false);
        fetchMessages(conversationId);
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to send');
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
                  Requests <span className="text-xs font-thin">({requestConversations.length + pendingRequests.length})</span>
                </button>
              </div>

              <div className="flex items-center justify-between ">
                <button 
                  onClick={() => setActiveTab("sent")}
                  className={`flex items-center border rounded-full p-3 gap-2 transition-all active:scale-95 ${
                    activeTab === "sent" ? "bg-white/20 border-white" : "border-white/50"
                  }`}
                >
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
                    {activeTab === "requests" && pendingRequests.length > 0 && (
                      <div className="flex flex-col gap-3 mb-2">
                        <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-widest px-1">Friend Requests</h3>
                        {pendingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10"
                          >
                            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                              <Image 
                                src={req.user?.displayPictureUrl || "/assets/ico.png"} 
                                alt={req.user?.username || "User"} 
                                fill 
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{req.user?.username || "Unknown"}</div>
                              <div className="text-[10px] text-white/50">{req.message || "Wants to be your friend"}</div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAcceptRequest(req.id)}
                                className="bg-[#d91e82] text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleRejectRequest(req.id)}
                                className="bg-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="h-px bg-white/10 my-2" />
                      </div>
                    )}

                    {currentConversations.length === 0 && (activeTab !== "requests" || pendingRequests.length === 0) ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-white/60">No conversations yet</p>
                      </div>
                    ) : (
                      currentConversations.map((conversation, i) => (
                        <button
                          key={conversation.conversationId || i}
                          onClick={() => setActiveChat(conversation)}
                          className={`flex items-center gap-4 border-b border-white/20 pb-4 text-left hover:bg-white/5 px-2 rounded-xl transition-colors group ${
                            activeChat?.conversationId === conversation.conversationId ? '' : ''
                          }`}
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                            <Image 
                              src={conversation.otherUser?.displayPictureUrl || "/assets/ico.png"} 
                              alt={conversation.otherUser?.username || "User"} 
                              fill 
                              className="object-cover "
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-base flex items-center justify-between">
                              <span>{conversation.otherUser?.username || "User"}</span>
                              {activeTab === "requests" && (conversation.friendRequestId || conversation.followRequestId) && (
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleAcceptRequest(conversation.friendRequestId || conversation.followRequestId)}
                                    className="bg-[#d91e82] text-white text-[10px] font-bold px-3 py-1 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md"
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    onClick={() => handleRejectRequest(conversation.friendRequestId || conversation.followRequestId)}
                                    className="bg-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full hover:bg-white/20 active:scale-95 transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-white/50 truncate font-light mt-0.5">
                              {conversation.lastMessage?.message || conversation.lastMessage?.text || (conversation.isFollowRequest ? "Requested to be friends" : "No messages yet")}
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


          {/* CHAT VIEW */}
          <div
            className={`md:w-[60%] w-full h-full flex flex-col p-2
            ${activeChat ? "flex" : "hidden md:flex"}`}
          >
            {activeChat ? (
              <>

  <div className="border border-white/50 rounded-[50px]  flex-1 flex flex-col overflow-hidden ">
                {/* Header */}
                <div className="flex items-center justify-between md:px-6  md:p-2 md:mt-6  bg-black/20 md:bg-transparent ">
                    <div className="flex items-center gap-3 bg-purple-600/20 border border-white p-1.5 pr-6 rounded-full">
                      <button
                        onClick={() => setActiveChat(null)}
                        className="md:hidden text-2xl pl-2"
                      >
                        <IoChevronBack />
                      </button>

                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                          <Image 
                            src={activeChat.otherUser?.displayPictureUrl || "/assets/ico.png"} 
                            alt="User" 
                            fill 
                            className="object-cover rounded-full"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 text-lg">
                          🐵
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-white leading-tight">
                          {activeChat.otherUser?.username || "User"}
                          {activeChat.otherUser?.age ? `, ${activeChat.otherUser.age}` : ', 23'}
                        </span>
                        <div className="flex items-center gap-1 text-white/80 text-xs">
                          <IoLocationOutline className="text-white" />
                          <span>{activeChat.otherUser?.city || "Banglore"}</span>
                        </div>
                      </div>
                    </div>

                  {/* <img src="/assets/Video-on.svg" alt="Video" className="w-10 h-10 opacity-70 m-2" /> */}
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
                         
                            <div className={`p-1 rounded-2xl max-w-[75%] shadow-md overflow-hidden ${
                              isMe 
                                ? 'bg-black/20 text-white rounded-tr-none border border-white/10' 
                                : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                            }`}>
                              {/* Gift Rendering */}
                              {(message.giftId || message.messageType === 'GIFT' || message.messageType === 'GIFT_WITH_MESSAGE') && (
                                <div className="bg-black/20 rounded-xl p-3 mb-1 flex flex-col items-center gap-2 border border-white/10">
                                  <div className="relative w-16 h-16">
                                    <Image 
                                      src={`/gift/${message.giftId || 'gift1'}.png`} 
                                      alt="Gift" 
                                      fill 
                                      className="object-contain" 
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                                    <div className="relative w-3 h-3">
                                      <Image src="/gift/dimond.png" alt="coin" fill className="object-contain" />
                                    </div>
                                    <span className="text-xs font-bold">{message.giftAmount || 0}</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Text Message Rendering */}
                              {message.message && (
                                <div className="px-4 py-2 whitespace-pre-wrap break-words text-[15px]">
                                  {message.message}
                                </div>
                              )}
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
                      className="w-full bg-white/5 backdrop-blur-md border border-white/60 rounded-[12px]  py-3 md:py-4 px-6 pr-14 text-white placeholder-white/40 focus:outline-none focus:border-white/90 transition-all shadow-inner"
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
                  <button 
                    onClick={() => setIsGiftModalOpen(true)}
                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center active:scale-95 transition-transform relative group "
                  >
                    <img 
                      src="/circle.png" 
                      alt="button-bg" 
                      className="absolute inset-0 w-full h-full bg-pink-700 rounded-full object-contain group-hover:scale-105 transition-transform opacity-100" 
                    />
                    <img 
                      src="/giftboc.png" 
                      alt="gift-icon" 
                      className="relative w-6 h-6 md:w-8 md:h-8 object-contain group-hover:rotate-12 transition-transform" 
                    />
                  </button>
                </div>

                <GiftModal 
                  isOpen={isGiftModalOpen}
                  onClose={() => setIsGiftModalOpen(false)}
                  onSelectGift={(gift) => {
                    sendMessage(gift);
                  }}
                />
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
