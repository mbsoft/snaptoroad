const WebSocket = require("ws"); // Import the ws WebSocket implementation
//299600ff679543158f4e81129615bbbe
const url = "wss://sgpstg.nextbillion.io/skynet/subscribe?key=299600ff679543158f4e81129615bbbe";
let socket;
let heartbeatInterval;
let reconnectTimeout;

function getTimestamp() {
  return new Date().toISOString();
}

// Function to start the WebSocket connection
function connect() {
  socket = new WebSocket(url);

  socket.on("open", () => {
    console.log(`[${getTimestamp()}] Connected to server`);
    socket.send(
      JSON.stringify({
        action: "TRIP_SUBSCRIBE",
        id: "1001",
        params: { id: "8h4FaNX_4Xit5ygg177u1" },
      })
    );

    // Start sending HEARTBEAT every 60 seconds
    heartbeatInterval = setInterval(() => {
      const heartbeatMessage = JSON.stringify({
        id: "1001",
        action: "HEARTBEAT",
      });
      console.log(`[${getTimestamp()}] Sending HEARTBEAT: ${heartbeatMessage}`);
      socket.send(heartbeatMessage);
    }, 60000); // 60 seconds in milliseconds
  });

  socket.on("message", (data) => {
    console.log(`[${getTimestamp()}] Received message:`, data.toString());
  });

  socket.on("ping", () => {
    console.log(`[${getTimestamp()}] Received PING from server`);
    socket.pong(); // Respond with a PONG frame
  });

  socket.on("close", () => {
    console.log(`[${getTimestamp()}] Connection closed`);
    clearInterval(heartbeatInterval); // Stop HEARTBEAT on close
    // Attempt to reconnect after a delay
    reconnectTimeout = setTimeout(connect, 5000); // 5-second delay before reconnect
  });

  socket.on("error", (error) => {
    console.error(`[${getTimestamp()}] WebSocket error:`, error);
    clearInterval(heartbeatInterval); // Stop HEARTBEAT on error
  });
}

// Start the initial connection
connect();
