function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast bg-gray-700 text-white p-2 rounded-md";
  toast.textContent = message;
  document.getElementById("toastContainer")?.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

if (document.getElementById("username")) {
  const usernameInput = document.getElementById("username");
  const roomIdInput = document.getElementById("roomId");
  const generateRoomButton = document.getElementById("generateRoom");
  const joinRoomButton = document.getElementById("joinRoom");
  const micEnabled = document.getElementById("micEnabled");
  const camEnabled = document.getElementById("camEnabled");

  function validateInputs() {
    const roomId = roomIdInput.value.trim();
    joinRoomButton.disabled = !usernameInput.value.trim() || !roomId || !/^\d{6}$/.test(roomId);
  }

  usernameInput.addEventListener("input", validateInputs);
  roomIdInput.addEventListener("input", validateInputs);

  generateRoomButton.addEventListener("click", () => {
    roomIdInput.value = generateRoomId();
    validateInputs();
  });

  joinRoomButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    if (username && /^\d{6}$/.test(roomId)) {
      const params = new URLSearchParams({
        id: roomId,
        user: username,
        mic: micEnabled.checked,
        cam: camEnabled.checked,
      }).toString();
      window.location.href = `room.html?${params}`;
    }
  });
}

if (window.location.pathname.includes("room.html")) {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("id");
  const username = params.get("user")?.replace(/[<>&"]/g, "") || "Anonymous";
  const micOn = params.get("mic") === "true";
  const camOn = params.get("cam") === "true";
  if (!roomId || !/^\d{6}$/.test(roomId)) {
    window.location.href = "index.html";
  }

  const socket = io("https://callio.onrender.com");
  const peer = new Peer({ host: "peerjs.com", port: 443, path: "/peerjs" });
  const videoContainer = document.getElementById("videoContainer");
  const localVideo = document.getElementById("localVideo");
  const localUsername = document.getElementById("localUsername");
  const toggleMic = document.getElementById("toggleMic");
  const toggleCamera = document.getElementById("toggleCamera");
  const sendEmoji = document.getElementById("sendEmoji");
  const shareRoom = document.getElementById("shareRoom");
  const leaveRoom = document.getElementById("leaveRoom");
  let localStream;

  localUsername.textContent = username;

  async function startStream() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: camOn,
        audio: micOn,
      });
      localVideo.srcObject = localStream;
      showToast("Connected to camera and mic");
    } catch (err) {
      console.error("Media error:", err);
      showToast("Failed to access camera/mic. Check permissions.");
    }
  }

  peer.on("open", (id) => {
    socket.emit("join-room", roomId, id, username);
  });

  peer.on("call", (call) => {
    call.answer(localStream);
    call.on("stream", (remoteStream) => {
      addVideoStream(remoteStream, call.peer);
    });
  });

  socket.on("user-connected", (userId, remoteUsername) => {
    const call = peer.call(userId, localStream);
    call.on("stream", (remoteStream) => {
      addVideoStream(remoteStream, userId, remoteUsername);
    });
    showToast(`${remoteUsername} joined the room`);
  });

  socket.on("user-disconnected", (userId) => {
    document.getElementById(`peer-${userId}`)?.remove();
    showToast(`User ${userId} left the room`);
  });

  socket.on("emoji", (userId, emoji) => {
    const container = document.getElementById(`peer-${userId}`) || document.getElementById("localVideoContainer");
    if (container) {
      const emojiDiv = document.createElement("div");
      emojiDiv.className = "emoji-overlay absolute top-1/2 left-1/2 transform -translate-x-1/2";
      emojiDiv.textContent = emoji;
      container.appendChild(emojiDiv);
      setTimeout(() => emojiDiv.remove(), 2000);
    }
  });

  function addVideoStream(stream, peerId, username = "Unknown") {
    if (document.getElementById(`peer-${peerId}`)) return;
    const container = document.createElement("div");
    container.id = `peer-${peerId}`;
    container.className = "relative";
    const video = document.createElement("video");
    video.className = "remote-video w-full h-full object-cover";
    video.srcObject = stream;
    video.autoplay = true;
    video.playsinline = true;
    const label = document.createElement("p");
    label.className = "text-center text-sm mt-1";
    label.textContent = username;
    container.appendChild(video);
    container.appendChild(label);
    videoContainer.appendChild(container);
  }

  toggleMic.addEventListener("click", () => {
    if (localStream) {
      const enabled = !localStream.getAudioTracks()[0].enabled;
      localStream.getAudioTracks()[0].enabled = enabled;
      toggleMic.innerHTML = enabled
        ? `<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m0 0v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>`
        : `<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m0 0v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5 5l14 14"></path></svg>`;
      showToast(enabled ? "Microphone on" : "Microphone off");
    }
  });

  toggleCamera.addEventListener("click", () => {
    if (localStream) {
      const enabled = !localStream.getVideoTracks()[0]?.enabled;
      localStream.getVideoTracks()[0].enabled = enabled;
      toggleCamera.innerHTML = enabled
        ? `<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`
        : `<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM5 5l14 14"></path></svg>`;
      showToast(enabled ? "Camera on" : "Camera off");
    }
  });

  sendEmoji.addEventListener("click", () => {
    const emojis = ["😊", "👍", "🎉", "❤️"];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    socket.emit("emoji", emoji);
    showToast(`Sent emoji ${emoji}`);
  });

  shareRoom.addEventListener("click", () => {
    const url = `${window.location.origin}/room.html?id=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(url);
    showToast("Room link copied to clipboard");
  });

  leaveRoom.addEventListener("click", () => {
    localStream?.getTracks().forEach((track) => track.stop());
    socket.disconnect();
    window.location.href = "index.html";
  });

  startStream();
}