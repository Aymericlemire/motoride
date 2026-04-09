/**
 * Navigation bottom bar mobile-first.
 */
const navState = { activeTab: "map", loading: false };

export function getActiveTab() {
  return navState.activeTab;
}

export function setActiveTab(tab) {
  try {
    navState.loading = true;
    document.querySelectorAll(".tab-screen").forEach((screen) => {
      screen.classList.toggle("active", screen.id === `tab-${tab}`);
    });
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    navState.activeTab = tab;
    if (tab === "map" && window.motoTrackMap) {
      setTimeout(() => window.motoTrackMap.invalidateSize(), 180);
    }
  } catch (error) {
    console.error("[Navigation] Erreur setActiveTab:", error);
  } finally {
    navState.loading = false;
  }
}

export function initNavigation() {
  try {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });
  } catch (error) {
    console.error("[Navigation] Erreur initNavigation:", error);
  }
}
