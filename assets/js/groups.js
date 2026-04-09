import { getFirebaseServices } from "../../firebase-config.js";
import { ref, set, push, get, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const groupState = { loading: false, currentGroupId: null };

export async function createGroup(ownerUid, name) {
  groupState.loading = true;
  try {
    const { rtdb } = getFirebaseServices();
    const groupsRef = ref(rtdb, "groups");
    const newGroupRef = push(groupsRef);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await set(newGroupRef, { name, code, ownerUid, members: { [ownerUid]: true }, createdAt: Date.now() });
    groupState.currentGroupId = newGroupRef.key;
    return { groupId: newGroupRef.key, code };
  } catch (error) {
    console.error("[Groups] Erreur createGroup:", error);
    return null;
  } finally {
    groupState.loading = false;
  }
}

export async function joinGroupByCode(uid, code) {
  groupState.loading = true;
  try {
    const { rtdb } = getFirebaseServices();
    const snapshot = await get(ref(rtdb, "groups"));
    const groups = snapshot.val() || {};
    const entry = Object.entries(groups).find(([, g]) => g.code === code);
    if (!entry) return null;
    const [groupId] = entry;
    await set(ref(rtdb, `groups/${groupId}/members/${uid}`), true);
    groupState.currentGroupId = groupId;
    return groupId;
  } catch (error) {
    console.error("[Groups] Erreur joinGroupByCode:", error);
    return null;
  } finally {
    groupState.loading = false;
  }
}

export async function kickMember(groupId, adminUid, memberUid) {
  try {
    const { rtdb } = getFirebaseServices();
    const groupSnap = await get(ref(rtdb, `groups/${groupId}`));
    const group = groupSnap.val();
    if (!group || group.ownerUid !== adminUid) return false;
    await remove(ref(rtdb, `groups/${groupId}/members/${memberUid}`));
    return true;
  } catch (error) {
    console.error("[Groups] Erreur kickMember:", error);
    return false;
  }
}

export function watchGroup(groupId, callback) {
  const { rtdb } = getFirebaseServices();
  onValue(ref(rtdb, `groups/${groupId}`), (snapshot) => callback(snapshot.val()));
}
