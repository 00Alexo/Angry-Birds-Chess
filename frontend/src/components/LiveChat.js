import React, { useState, useEffect, useRef } from 'react';
import { 
  IoChatbubbleEllipses, IoSend, IoClose, IoChevronDown, 
  IoChevronUp, IoVolumeHigh, IoVolumeOff 
} from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import multiplayerSocket from '../services/multiplayerSocket';
import soundService from '../services/soundService';

const LiveChat = ({ 
  matchId, 
  opponentUsername, 
  isCompact = false, // For mobile/small screens
  isCollapsible = true, // Can be collapsed/expanded
  position = 'right' // 'right' for desktop sidebar, 'bottom' for mobile overlay
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up chat socket listeners
  useEffect(() => {
    if (!matchId || !user) return;

    console.log('[LiveChat] Setting up chat listeners for match:', matchId);

    // Listen for incoming chat messages
    const unsubscribeChatMessage = multiplayerSocket.onChatMessage((messageData) => {
      console.log('[LiveChat] Received chat message:', messageData);
      
      if (messageData.matchId !== matchId) return; // Ignore messages for other matches

      const newMsg = {
        id: Date.now() + Math.random(),
        text: messageData.message,
        sender: messageData.sender,
        timestamp: new Date(messageData.timestamp),
        isMe: messageData.sender.userId === user.id || messageData.sender.userId === user._id
      };

      setMessages(prev => [...prev, newMsg]);

      // Play notification sound if enabled and not from me
      if (soundEnabled && !newMsg.isMe) {
        playNotificationSound();
      }

      // Increment unread count if chat is collapsed and not from me
      if (!isExpanded && !newMsg.isMe) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Listen for typing indicators
    const unsubscribeTyping = multiplayerSocket.onTypingIndicator((data) => {
      if (data.matchId !== matchId) return;
      if (data.sender.userId === user.id || data.sender.userId === user._id) return; // Ignore my own typing

      setIsTyping(data.isTyping);

      // Clear typing indicator after timeout
      if (data.isTyping) {
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      unsubscribeChatMessage();
      unsubscribeTyping();
    };
  }, [matchId, user, soundEnabled, isExpanded]);

  // Play notification sound
  const playNotificationSound = () => {
    soundService.playChat();
  };

  // Send a chat message
  const sendMessage = () => {
    if (!newMessage.trim() || !matchId || !user) return;

    const messageData = {
      matchId,
      message: newMessage.trim(),
      sender: {
        userId: user.id || user._id,
        username: user.username
      },
      timestamp: new Date().toISOString()
    };

    console.log('[LiveChat] Sending chat message:', messageData);

    // Send via socket
    const success = multiplayerSocket.sendChatMessage(messageData);
    
    if (success) {
      setNewMessage(''); // Clear input immediately
      
      // Stop typing indicator
      sendTypingIndicator(false);
    } else {
      console.error('[LiveChat] Failed to send message');
      // Could show an error toast here
    }
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping) => {
    if (!matchId || !user) return;

    multiplayerSocket.sendTypingIndicator({
      matchId,
      sender: {
        userId: user.id || user._id,
        username: user.username
      },
      isTyping
    });
  };

  // Handle input change with typing indicators
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing start
    sendTypingIndicator(true);

    // Set timeout to stop typing indicator
    const timeout = setTimeout(() => {
      sendTypingIndicator(false);
    }, 1000);

    setTypingTimeout(timeout);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    
    // Clear unread count when expanding
    if (!isExpanded) {
      setUnreadCount(0);
    }

    // Focus input when expanding
    if (!isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Mobile/compact view (overlay style)
  if (isCompact) {
    return (
      <>
        {/* Floating chat button */}
        <button
          onClick={toggleExpanded}
          className={`fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
            isExpanded ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isExpanded ? (
            <IoClose className="text-white text-xl mx-auto" />
          ) : (
            <div className="relative">
              <IoChatbubbleEllipses className="text-white text-xl mx-auto" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
          )}
        </button>

        {/* Chat overlay */}
        {isExpanded && (
          <div className="fixed inset-x-4 bottom-20 z-30 bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 max-h-96 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-600">
              <div className="flex items-center space-x-2">
                <IoChatbubbleEllipses className="text-blue-400" />
                <span className="text-white font-medium text-sm">
                  Chat with {opponentUsername}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title={soundEnabled ? "Mute notifications" : "Enable notifications"}
                >
                  {soundEnabled ? (
                    <IoVolumeHigh className="text-slate-400 text-sm" />
                  ) : (
                    <IoVolumeOff className="text-slate-400 text-sm" />
                  )}
                </button>
                <button
                  onClick={toggleExpanded}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <IoClose className="text-slate-400 text-sm" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[250px]">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">
                  <IoChatbubbleEllipses className="text-3xl mx-auto mb-2 opacity-50" />
                  <p>Start the conversation!</p>
                  <p className="text-xs mt-1">Say hello to {opponentUsername}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        message.isMe
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-slate-700 text-slate-100 rounded-bl-md'
                      }`}
                    >
                      <div className="break-words">{message.text}</div>
                      <div
                        className={`text-xs mt-1 opacity-70 ${
                          message.isMe ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-100 px-3 py-2 rounded-2xl rounded-bl-md text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-600">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${opponentUsername}...`}
                  className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-xl border border-slate-600 focus:border-blue-400 focus:outline-none text-sm"
                  maxLength={200}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <IoSend className="text-white text-sm" />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar view
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-600 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-12'
    } h-full max-h-[600px] flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-600">
        {isExpanded ? (
          <>
            <div className="flex items-center space-x-2">
              <IoChatbubbleEllipses className="text-blue-400" />
              <span className="text-white font-medium text-sm">
                Chat with {opponentUsername}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
                title={soundEnabled ? "Mute notifications" : "Enable notifications"}
              >
                {soundEnabled ? (
                  <IoVolumeHigh className="text-slate-400 text-sm" />
                ) : (
                  <IoVolumeOff className="text-slate-400 text-sm" />
                )}
              </button>
              {isCollapsible && (
                <button
                  onClick={toggleExpanded}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <IoChevronDown className="text-slate-400 text-sm" />
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center justify-center relative"
          >
            <div className="relative">
              <IoChatbubbleEllipses className="text-blue-400 text-xl" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">
                <IoChatbubbleEllipses className="text-3xl mx-auto mb-2 opacity-50" />
                <p>Start the conversation!</p>
                <p className="text-xs mt-1">Say hello to {opponentUsername}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      message.isMe
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-slate-700 text-slate-100 rounded-bl-md'
                    }`}
                  >
                    <div className="break-words">{message.text}</div>
                    <div
                      className={`text-xs mt-1 opacity-70 ${
                        message.isMe ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 px-3 py-2 rounded-2xl rounded-bl-md text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-600">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${opponentUsername}...`}
                className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-xl border border-slate-600 focus:border-blue-400 focus:outline-none text-sm"
                maxLength={200}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                <IoSend className="text-white text-sm" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveChat;
