const express = require("express");
const PORT = process.env.PORT || 3030;
const INDEX = "../Frontend/src/index.js";
const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`listening on ${PORT}`));

const Websocket = require("ws");
const wss = new Websocket.Server({ server });
const tmi = require("tmi.js");
let isListening = false;
let latestMsg = "";
// let chatTimer = 0;
let client;
const madlibLibraryJson = require("./MadlibLibrary.json");
// let timer;

let opts = {
  identity: {
    username: "chatgamesbot",
    password: "oauth:sdjtd4gea4ktqyamztqlafgqjbzduh"
  },
  channels: [""]
};

function clientSetup() {
  client = new tmi.client(opts);
  client.on("message", onMessageHandler);
  client.on("connected", onConnectedHandler);
  client.on("disconnected", onDisconnectedHandler);
  client.connect();
}

function onDisconnectedHandler() {
  console.log(`* disconnected`);
}

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function onMessageHandler(target, context, msg, self) {
  if (self) {
    return;
  }
  latestMsg = msg;

  if (isListening) {
    wss.clients.forEach(onMsgReceivedFromTwitch);
  }
}

wss.on("connection", ws => {
  console.log("client connected");
  ws.on("message", wsMessageHandler);
  ws.on("close", () => {
    client = undefined;
    console.log("client disconnected");
  });
});

onMsgReceivedFromTwitch = client => {
  let newMsg = {
    type: "newMsg",
    payload: latestMsg
  };
  if (client.readyState === Websocket.OPEN) {
    client.send(JSON.stringify(newMsg));
  }
};

wsMessageHandler = msg => {
  const jsonMsg = JSON.parse(msg);
  console.log("msg from client: ", jsonMsg);
  switch (jsonMsg.type) {
    case "setupConfig":
      onSetupConfigMsg(jsonMsg.payload);
      break;
    case "getMadlibLibrary":
      onGetMadlibLibraryMsg();
      break;
    case "beginListen":
      onBeginListenMsg();
      break;
    case "streamReset":
      onStreamReset();
      break;
    case "stopListening":
      onStopListening();
      break;
    default:
      break;
  }
};

onStopListening = () => {
  isListening = false;
};

onStreamReset = () => {
  console.log("running streamreset");
  if (client !== undefined) {
    client.disconnect();
  }
  isListening = false;
};

onBeginListenMsg = () => {
  console.log("beginning to listen");
  isListening = true;
};

onGetMadlibLibraryMsg = () => {
  const libMsg = {
    type: "madlibLibraryJson",
    payload: madlibLibraryJson
  };
  wss.clients.forEach(client => client.send(JSON.stringify(libMsg)));
};

onSetupConfigMsg = payload => {
  chatTimer = payload.inputTimer;
  streamUrlStripped = payload.streamUrl.trim();
  opts.channels = [streamUrlStripped];
  clientSetup();
};
