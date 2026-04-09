import { getFirebaseServices } from "../../firebase-config.js";
import { ref, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const chatState = { loading: false };

export async function sendChatMessage(groupId, message) {
  chatState.loading = true;
  try {
    const { rtdb } = getFirebaseServices();
    await push(ref(rtdb, `chats/${groupId}/messages`), { ...message, createdAt: Date.now() });
  } catch (error) {
    console.error("[Chat] Erreur sendChatMessage:", error);
  } finally {
    chatState.loading = false;
  }
}

export function watchLastMessages(groupId, callback) {
  try {
    const { rtdb } = getFirebaseServices();
    const messagesRef = query(ref(rtdb, `chats/${groupId}/messages`), limitToLast(100));
    onValue(messagesRef, (snapshot) => callback(snapshot.val() || {}));
  } catch (error) {
    console.error("[Chat] Erreur watchLastMessages:", error);
  }
}
