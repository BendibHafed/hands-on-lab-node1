import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./App.css"

const API_URL = "http://localhost:5000";

function App() {
  const [motion, setMotion] = useState("unknown");
  const [led1, setLed1] = useState("off");
  const [led2, setLed2] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    let ignore = false; 
    // --- Initial REST fetch
    const fetchInitialState = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/status`);
            if (!ignore) {
                setMotion(res.data.motion);
                setLed1(res.data.led1);
                setLed2(res.data.led2);
            }
        } catch (error) {
            console.error("Failed to fetch initial status:", error);
        }
    };
    
    fetchInitialState();

    // --- WebSocket Setup
    socketRef.current = io(API_URL, { 
        transports: ["websocket"],
        reconnection:true
    });

    socketRef.current.on("connect", () => {
        console.log("Socket.IO connected - ID:", socketRef.current.id);
    });

    socketRef.current.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected:", reason);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socketRef.current.on("reconnect", (attempt) => {
        console.log("Socket reconnected after", attempt, "attempts");
    });

    // Listen for motion events
    socketRef.current.on("motion", (data) => {
      console.log("Motion event:", data);
      setMotion(data.motion);
    });

    // Listen for full state updates
    socketRef.current.on("state", (data) => {
      console.log("State update:", data);
      setMotion(data.motion);
      setLed1(data.led1);
      setLed2(data.led2);
    });

    // Listen for LED updates
    socketRef.current.on("led_update", (data) => {
      console.log("LED update:", data);
      if (data.led1 !== undefined) setLed1(data.led1);
      if (data.led2 !== undefined) setLed2(data.led2);
    });

    return () => {
        ignore = true;
      if (socketRef.current) {
        console.log("Cleaning up WebSocket connection");
        socketRef.current.disconnect();
      } 
    };
  }, []);

  // --- Control LED1
  const toggleLed1 = async () => {
    const newState = led1 === "on" ? "off" : "on";
    try {
        await axios.post(`${API_URL}/api/led1`, { state: newState });
        setLed1(newState);
    } catch (error) {
        console.error("Failed to toggle LED1", error);
    }
};

  // --- Control LED2
  const setLed2Level = async (level) => {
    try {
        await axios.post(`${API_URL}/api/led2`, { level });
        setLed2(level);
    } catch (error) {
        console.error("Failed to set LED2 level", error);
    }
  };

  // --- Helper for motion detection
  const motionDetected = motion.toLowerCase() === "motion";

  return (
    <div className="container">
      <h1 className="header">Node1 Dashboard</h1>

      <div className="grid">
        {/* Motion card */}
        <div className="card">
          <h2>Motion Sensor</h2>
          <p>
            Status:{" "}
            <span
                className="badge"
                style={{backgroundColor: motionDetected ? "#ff0000" : "#009f00"}}
            >
              {motionDetected ? "MOTION DETECTED" : "NO MOTION"}
            </span>
          </p>
        </div>

        {/* LED1 card */}
        <div className="card">
          <h2>LED1</h2>
          <p>
            State:{" "}
            <span
                className="badge"
                style={{backgroundColor: led1 === "on" ? "#ff9900" : "#333"}}

            >
              {led1.toUpperCase()}
            </span>
          </p>
          <button className="button" onClick={toggleLed1}>
            {led1 === "on" ? "Turn OFF" : "Turn ON"}
          </button>
        </div>

        {/* LED2 card */}
        <div className="card">
          <h2>LED2</h2>
          <p>
            Brightness: <span className="level">{led2}</span>
          </p>
          <input
            type="range"
            min="0"
            max="5"
            value={led2}
            onChange={(e) => setLed2Level(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
