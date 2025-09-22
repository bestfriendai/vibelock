import { useEffect } from "react";
import useChatStore from "../state/chatStore";

const useChatJoin = (
  roomId: string | undefined,
  canAccessChat: boolean,
  needsSignIn: boolean,
  user: any,
  joinChatRoom: (roomId: string) => Promise<void>,
  leaveChatRoom: (roomId: string) => void,
) => {
  useEffect(() => {
    if (roomId && canAccessChat && !needsSignIn && user) {
      joinChatRoom(roomId);
    }
    return () => {
      if (roomId) {
        leaveChatRoom(roomId);
      }
    };
  }, [roomId, canAccessChat, needsSignIn, user]);
};

export default useChatJoin;
