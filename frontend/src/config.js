function getConfig(name, defaultValue = null) {
  // If inside a docker container, use window.ENV
  if (typeof window !== "undefined" && window.ENV !== undefined) {
    return window.ENV[name] || defaultValue;
  }

  return import.meta.env[name] || defaultValue;
}

export function getBackendUrl() {
  return getConfig("VITE_BACKEND_URL") || getConfig("REACT_APP_BACKEND_URL") || "http://localhost:8080/";
}

export function getHoursCloseTicketsAuto() {
  return getConfig("VITE_HOURS_CLOSE_TICKETS_AUTO") || getConfig("REACT_APP_HOURS_CLOSE_TICKETS_AUTO");
}
