/**
 * Gestion Bluetooth (Web Bluetooth) pour tests intercom.
 * Note: l'accès dépend du navigateur et des services GATT exposés par l'appareil.
 */

const bluetoothState = {
  loading: false,
  supported: typeof navigator !== "undefined" && "bluetooth" in navigator,
  device: null,
  server: null,
  batteryLevel: null,
  compatibilityMode: "unknown",
  discoveredServices: []
};

function updateStatus(targetId, message) {
  const node = document.getElementById(targetId);
  if (node) node.textContent = message;
}

async function readBatteryLevel() {
  try {
    if (!bluetoothState.server?.connected) return null;
    const service = await bluetoothState.server.getPrimaryService("battery_service");
    const characteristic = await service.getCharacteristic("battery_level");
    const value = await characteristic.readValue();
    const level = value.getUint8(0);
    bluetoothState.batteryLevel = level;
    return level;
  } catch {
    // Service souvent indisponible sur de nombreux intercoms.
    return null;
  }
}

function onDeviceDisconnected() {
  bluetoothState.device = null;
  bluetoothState.server = null;
  bluetoothState.batteryLevel = null;
  bluetoothState.compatibilityMode = "unknown";
  bluetoothState.discoveredServices = [];
  updateStatus("bluetoothStatus", "Intercom déconnecté.");
}

export function getBluetoothState() {
  return { ...bluetoothState };
}

export async function connectBluetoothDevice() {
  bluetoothState.loading = true;
  try {
    if (!bluetoothState.supported) {
      throw new Error("Web Bluetooth non supporté par ce navigateur.");
    }

    updateStatus("bluetoothStatus", "Recherche de l'intercom...");

    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: "Sena" },
        { namePrefix: "Cardo" },
        { namePrefix: "Fodsports" },
        { namePrefix: "FreedConn" },
        { namePrefix: "Intercom" },
        { services: ["battery_service"] }
      ],
      optionalServices: ["battery_service", 0x180f, 0x180a, 0x1800]
    });

    bluetoothState.device = device;
    bluetoothState.device.addEventListener("gattserverdisconnected", onDeviceDisconnected);

    bluetoothState.server = await device.gatt.connect();
    const battery = await readBatteryLevel();
    const services = await diagnoseGattServices();
    const hasAnyService = services.length > 0;
    bluetoothState.compatibilityMode = hasAnyService ? "gatt-ok" : "audio-only";

    updateStatus(
      "bluetoothStatus",
      battery !== null
        ? `Connecté: ${device.name || "Intercom"} (batterie ${battery}%)`
        : `Connecté: ${device.name || "Intercom"} (${hasAnyService ? "mode GATT" : "mode audio uniquement"})`
    );

    return device;
  } catch (error) {
    console.error("[Bluetooth] Erreur connexion:", error);
    updateStatus("bluetoothStatus", `Erreur Bluetooth: ${error.message}`);
    throw error;
  } finally {
    bluetoothState.loading = false;
  }
}

export async function diagnoseGattServices() {
  try {
    if (!bluetoothState.server?.connected) return [];
    const services = await bluetoothState.server.getPrimaryServices();
    bluetoothState.discoveredServices = services.map((service) => service.uuid);
    return [...bluetoothState.discoveredServices];
  } catch (error) {
    console.error("[Bluetooth] Erreur diagnostic services:", error);
    bluetoothState.discoveredServices = [];
    return [];
  }
}

export async function disconnectBluetoothDevice() {
  bluetoothState.loading = true;
  try {
    if (bluetoothState.device?.gatt?.connected) {
      bluetoothState.device.gatt.disconnect();
    }
    onDeviceDisconnected();
  } catch (error) {
    console.error("[Bluetooth] Erreur déconnexion:", error);
    updateStatus("bluetoothStatus", "Erreur lors de la déconnexion.");
  } finally {
    bluetoothState.loading = false;
  }
}
