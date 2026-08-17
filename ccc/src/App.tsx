import React, { useState, useEffect } from "react";
import { LobbyView } from "./components/LobbyView";
import { WatchPartyRoom } from "./components/WatchPartyRoom";
import { Language } from "./types";

export default function App() {
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [myUsername, setMyUsername] = useState<string>("");
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myPeerId, setMyPeerId] = useState<string>("");
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("syncwatch_lang") as Language) || "bn";
  });
  const [urlRoomId, setUrlRoomId] = useState<string>("");

  // Initialize peer ID & parse URL parameters
  useEffect(() => {
    let peerId = sessionStorage.getItem("syncwatch_peer_id");
    if (!peerId) {
      peerId = `peer-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("syncwatch_peer_id", peerId);
    }
    setMyPeerId(peerId);

    // Check URL parameters for ?room=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      setUrlRoomId(roomParam.toUpperCase());
    }
  }, []);

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "en" ? "bn" : "en";
      localStorage.setItem("syncwatch_lang", next);
      return next;
    });
  };

  const handleJoinRoom = (targetRoomId: string, username: string, asHost: boolean) => {
    setRoomId(targetRoomId);
    setMyUsername(username);
    setIsHost(asHost);
    setIsInRoom(true);

    // Update URL parameter without reload
    const newUrl = `${window.location.pathname}?room=${targetRoomId}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  const handleLeaveRoom = () => {
    setIsInRoom(false);
    setRoomId("");
    // Clear URL parameter
    window.history.pushState({}, "", window.location.pathname);
  };

  return (
    <div className="w-full h-full min-h-screen bg-neutral-950 font-sans text-neutral-100">
      {isInRoom && roomId ? (
        <WatchPartyRoom
          roomId={roomId}
          myPeerId={myPeerId}
          myUsername={myUsername}
          isHost={isHost}
          onLeaveRoom={handleLeaveRoom}
          language={language}
          onToggleLanguage={handleToggleLanguage}
        />
      ) : (
        <LobbyView
          onJoinRoom={handleJoinRoom}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          initialRoomIdFromUrl={urlRoomId}
        />
      )}
    </div>
  );
}
