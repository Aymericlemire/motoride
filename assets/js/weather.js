import { WEATHER_API_KEY, WEATHER_BASE_URL } from "../../firebase-config.js";

const weatherState = { loading: false };

export async function loadWeather(lat, lon) {
  weatherState.loading = true;
  try {
    const currentUrl = `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=fr`;
    const forecastUrl = `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=fr`;
    const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    if (!currentRes.ok || !forecastRes.ok) throw new Error("Erreur API météo");
    const current = await currentRes.json();
    const forecast = await forecastRes.json();
    return { current, forecast };
  } catch (error) {
    console.error("[Weather] Erreur loadWeather:", error);
    return null;
  } finally {
    weatherState.loading = false;
  }
}

export function renderWeatherWidget(payload) {
  try {
    const widget = document.getElementById("weatherWidget");
    if (!widget || !payload) return;
    const temp = Math.round(payload.current.main.temp);
    const wind = Math.round(payload.current.wind.speed * 3.6);
    const rain = payload.current.rain?.["1h"] || 0;
    const dangerous = wind > 60 || rain > 8;
    widget.innerHTML = `
      <strong>${temp}°C</strong><br>
      Vent: ${wind} km/h<br>
      Pluie: ${rain} mm/h
      ${dangerous ? "<br><span style='color:#ef4444'>Alerte conditions dangereuses</span>" : ""}
    `;
  } catch (error) {
    console.error("[Weather] Erreur renderWeatherWidget:", error);
  }
}
