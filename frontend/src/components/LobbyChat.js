import React, { useState, useEffect, useRef } from 'react';
import { IoSend, IoChatbubbleEllipses, IoVolumeHigh, IoVolumeOff } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import multiplayerSocket from '../services/multiplayerSocket';
import soundService from '../services/soundService';

const LobbyChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up lobby chat listeners
  useEffect(() => {
    if (!user) return;

    console.log('[LobbyChat] Setting up lobby chat listeners');

    // Listen for lobby chat messages
    const unsubscribeLobbyChat = multiplayerSocket.onLobbyChatMessage((messageData) => {
      console.log('[LobbyChat] Received lobby message:', messageData);
      
      const newMsg = {
        id: messageData.id || Date.now() + Math.random(),
        text: messageData.message,
        sender: messageData.sender,
        timestamp: new Date(messageData.timestamp || messageData.serverTimestamp),
        isMe: messageData.sender.userId === user.id || messageData.sender.userId === user._id
      };

      setMessages(prev => {
        // Avoid duplicate messages
        if (prev.find(msg => msg.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      // Play notification sound if enabled and not from me
      if (soundEnabled && !newMsg.isMe) {
        playNotificationSound();
      }
    });

    // Listen for recent lobby messages response
    const unsubscribeLobbyMessages = multiplayerSocket.onLobbyMessages((messages) => {
      console.log('[LobbyChat] Received recent lobby messages:', messages);
      
      if (Array.isArray(messages)) {
        const formattedMessages = messages.map(messageData => ({
          id: messageData.id || Date.now() + Math.random(),
          text: messageData.message,
          sender: messageData.sender,
          timestamp: new Date(messageData.timestamp || messageData.serverTimestamp),
          isMe: messageData.sender.userId === user.id || messageData.sender.userId === user._id
        }));
        
        setMessages(formattedMessages);
      }
    });

    // Request recent lobby messages
    multiplayerSocket.requestLobbyMessages();

    return () => {
      unsubscribeLobbyChat();
      unsubscribeLobbyMessages();
    };
  }, [user, soundEnabled]);

  // Play notification sound
  const playNotificationSound = () => {
    soundService.playChat();
  };

  // Send a lobby chat message
  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      message: newMessage.trim(),
      sender: {
        userId: user.id || user._id,
        username: user.username
      },
      timestamp: new Date().toISOString()
    };

    console.log('[LobbyChat] Sending lobby message:', messageData);

    // Send via socket
    const success = multiplayerSocket.sendLobbyChatMessage(messageData);
    
    if (success) {
      setNewMessage('');
    } else {
      console.error('[LobbyChat] Failed to send message');
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get user color based on rating or status
  const getUserColor = (sender) => {
    if (sender.userId === user?.id || sender.userId === user?._id) {
      return 'text-blue-400'; // My messages
    }
    
    // You could add logic here to color users based on their rating
    return 'text-green-400'; // Other users
  };

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-xl border border-white/30 h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/30">
        <div className="flex items-center space-x-2">
          <IoChatbubbleEllipses className="text-blue-400" />
          <h3 className="text-lg font-bold text-white">Lobby Chat</h3>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={soundEnabled ? "Mute notifications" : "Enable notifications"}
        >
          {soundEnabled ? (
            <IoVolumeHigh className="text-slate-400" />
          ) : (
            <IoVolumeOff className="text-slate-400" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <IoChatbubbleEllipses className="text-4xl mx-auto mb-3 opacity-50" />
            <p className="text-lg">Welcome to the lobby!</p>
            <p className="text-sm mt-2">Chat with other players while you wait for matches.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold text-sm ${getUserColor(message.sender)}`}>
                    {message.sender.username}
                  </span>
                  <span className="text-xs text-white/50">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="text-white/90 text-sm bg-white/10 rounded-lg p-2 ml-4 break-words">
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/30">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message to the lobby..."
            className="flex-1 bg-white/10 text-white px-4 py-2 rounded-lg border border-white/30 focus:border-blue-400 focus:outline-none placeholder-white/50"
            maxLength={200}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <IoSend className="text-white" />
          </button>
        </div>
        <div className="text-xs text-white/50 mt-2">
          Press Enter to send • Be respectful to other players
        </div>
      </div>
    </div>
  );
};

export default LobbyChat;
