/**
 * MotoTrack - Gestion de l'authentification et du profil rider.
 * Module autonome, pensé pour une UI mobile-first.
 */

import { initializeFirebase, getFirebaseServices } from "../../firebase-config.js";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const AUTH_EVENTS = {
  STATE_CHANGED: "mototrack:auth-state-changed",
  LOADING_CHANGED: "mototrack:auth-loading-changed",
  ERROR: "mototrack:auth-error",
  SUCCESS: "mototrack:auth-success"
};

const authState = {
  loading: false,
  initialized: false,
  user: null,
  riderProfile: null
};

function dispatchAuthEvent(type, detail) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function setLoading(value) {
  authState.loading = value;
  dispatchAuthEvent(AUTH_EVENTS.LOADING_CHANGED, { loading: value });
}

function getFriendlyAuthError(errorCode) {
  const messages = {
    "auth/user-not-found": "Aucun compte trouvé avec cet email.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Identifiants invalides.",
    "auth/email-already-in-use": "Cet email est déjà utilisé.",
    "auth/weak-password": "Le mot de passe est trop faible (6 caractères minimum).",
    "auth/popup-closed-by-user": "La fenêtre de connexion Google a été fermée.",
    "auth/popup-blocked": "Popup bloquée par le navigateur. Utilise la redirection.",
    "auth/unauthorized-domain": "Domaine non autorisé dans Firebase Auth. Ajoute ton domaine web.app dans Authorized domains.",
    "auth/network-request-failed": "Problème réseau, vérifie ta connexion.",
    "auth/requires-recent-login": "Reconnecte-toi pour effectuer cette action sensible."
  };

  return messages[errorCode] || "Une erreur inattendue est survenue.";
}

async function ensureProfile(user) {
  if (!user) return null;

  const { db } = getFirebaseServices();
  const riderRef = doc(db, "riders", user.uid);

  const defaultProfile = {
    uid: user.uid,
    email: user.email || "",
    pseudo: user.displayName || "Rider",
    photoURL: user.photoURL || "",
    motoType: "",
    city: "",
    publicStats: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    const profileSnap = await getDoc(riderRef);
    if (!profileSnap.exists()) {
      await setDoc(riderRef, defaultProfile, { merge: true });
      return defaultProfile;
    }

    const existing = profileSnap.data();
    return { ...defaultProfile, ...existing };
  } catch (error) {
    console.error("[Auth] Erreur profil rider :", error);
    throw error;
  }
}

function setUserState(user, riderProfile = null) {
  authState.user = user;
  authState.riderProfile = riderProfile;
  dispatchAuthEvent(AUTH_EVENTS.STATE_CHANGED, { ...authState });
}

export async function initAuth() {
  if (authState.initialized) {
    return authState;
  }

  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();

    // Récupère le résultat Google en mode redirect (fallback mobile).
    const redirectResult = await getRedirectResult(auth).catch(() => null);
    if (redirectResult?.user) {
      const redirectProfile = await ensureProfile(redirectResult.user);
      setUserState(redirectResult.user, redirectProfile);
      dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Connexion Google réussie (redirect)." });
    }

    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setUserState(null, null);
          return;
        }

        const profile = await ensureProfile(user);
        setUserState(user, profile);
      } catch (error) {
        const message = getFriendlyAuthError(error.code);
        dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
      } finally {
        setLoading(false);
      }
    });

    authState.initialized = true;
    return authState;
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    setLoading(false);
    throw error;
  }
}

export async function signInWithGoogle() {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await ensureProfile(result.user);
      setUserState(result.user, profile);
      dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Connexion Google réussie." });
      return result.user;
    } catch (popupError) {
      // Fallback mobile / popup bloquée: redirection OAuth.
      if (popupError?.code === "auth/popup-blocked" || popupError?.code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupError;
    }
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function signInWithEmail(email, password) {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await ensureProfile(credential.user);
    setUserState(credential.user, profile);

    dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Connexion réussie." });
    return credential.user;
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function registerWithEmail(email, password, pseudo = "Rider") {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, { displayName: pseudo });
    const profile = await ensureProfile({ ...credential.user, displayName: pseudo });
    setUserState(credential.user, profile);

    dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Compte créé avec succès." });
    return credential.user;
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function sendResetPassword(email) {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    await sendPasswordResetEmail(auth, email);
    dispatchAuthEvent(AUTH_EVENTS.SUCCESS, {
      message: "Email de réinitialisation envoyé."
    });
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function updateRiderProfile(profileUpdates = {}) {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth, db } = getFirebaseServices();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Utilisateur non connecté.");
    }

    const riderRef = doc(db, "riders", user.uid);
    const safeUpdates = {
      pseudo: profileUpdates.pseudo ?? authState.riderProfile?.pseudo ?? "Rider",
      motoType: profileUpdates.motoType ?? authState.riderProfile?.motoType ?? "",
      city: profileUpdates.city ?? authState.riderProfile?.city ?? "",
      publicStats: typeof profileUpdates.publicStats === "boolean"
        ? profileUpdates.publicStats
        : (authState.riderProfile?.publicStats ?? true),
      photoURL: profileUpdates.photoURL ?? authState.riderProfile?.photoURL ?? user.photoURL ?? "",
      updatedAt: serverTimestamp()
    };

    await updateDoc(riderRef, safeUpdates);

    if (safeUpdates.pseudo !== user.displayName || safeUpdates.photoURL !== user.photoURL) {
      await updateProfile(user, {
        displayName: safeUpdates.pseudo,
        photoURL: safeUpdates.photoURL
      });
    }

    const mergedProfile = { ...(authState.riderProfile || {}), ...safeUpdates };
    setUserState(user, mergedProfile);
    dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Profil mis à jour." });
    return mergedProfile;
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function logout() {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    await signOut(auth);
    setUserState(null, null);
    dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Déconnexion effectuée." });
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function deleteCurrentAccount(currentPassword = "") {
  setLoading(true);
  try {
    await initializeFirebase();
    const { auth } = getFirebaseServices();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Aucun utilisateur connecté.");
    }

    // Ré-authentification obligatoire pour les comptes Email/Password.
    if (user.providerData?.some((provider) => provider.providerId === "password") && currentPassword) {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    }

    await deleteUser(user);
    setUserState(null, null);
    dispatchAuthEvent(AUTH_EVENTS.SUCCESS, { message: "Compte supprimé." });
  } catch (error) {
    const message = getFriendlyAuthError(error.code);
    dispatchAuthEvent(AUTH_EVENTS.ERROR, { message, raw: error });
    throw error;
  } finally {
    setLoading(false);
  }
}

export function getAuthState() {
  return { ...authState };
}

export function getAuthEvents() {
  return { ...AUTH_EVENTS };
}
