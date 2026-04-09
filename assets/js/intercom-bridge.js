/**
 * Intercom Bridge
 * Objectif: ouvrir rapidement l'app constructeur (Cardo/Sena/etc.)
 * depuis la PWA pour réduire les frictions d'appairage/couplage.
 *
 * Important:
 * - Une PWA ne peut pas "piloter" les apps tierces en profondeur.
 * - On propose un pont pragmatique: deep-link si possible, sinon page web.
 */

const VENDORS = {
  cardo: {
    label: "Cardo Connect",
    deepLinks: ["cardoconnect://", "cardo://"],
    web: "https://www.cardosystems.com/"
  },
  sena: {
    label: "Sena Motorcycles",
    deepLinks: ["sena://", "senabluetoothmanager://"],
    web: "https://www.sena.com/"
  },
  midland: {
    label: "Midland",
    deepLinks: ["midland://"],
    web: "https://www.midlandeurope.com/"
  },
  fodsports: {
    label: "Fodsports",
    deepLinks: ["fodsports://"],
    web: "https://www.fodsports.com/"
  }
};

function safeOpenUrl(url) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 1200);
    return true;
  } catch {
    return false;
  }
}

export function getIntercomVendors() {
  return { ...VENDORS };
}

export async function openIntercomVendorApp(vendorKey) {
  const vendor = VENDORS[vendorKey];
  if (!vendor) {
    throw new Error("Marque intercom inconnue.");
  }

  // Tentative deep-link: utile surtout Android.
  for (const deepLink of vendor.deepLinks) {
    const ok = safeOpenUrl(deepLink);
    if (ok) {
      await new Promise((resolve) => setTimeout(resolve, 650));
    }
  }

  // Fallback universel vers page officielle.
  window.open(vendor.web, "_blank", "noopener,noreferrer");
  return vendor;
}
