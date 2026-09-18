import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

function connectToSocket() {
    let token = localStorage.getItem("token");
    if (token) {
      try {
        token = JSON.parse(token);
      } catch (e) {}
    }
    if (!token || token === "null" || token === "undefined") {
      return openSocket(getBackendUrl(), {
        autoConnect: false
      });
    }
    return openSocket(getBackendUrl(), {
      transports: ["websocket", "polling"],
      query: {
        token: token,
      },
    });
}

export default connectToSocket;