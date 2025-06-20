import './App.css';
import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:5001");
const myId = nanoid(4);

function App() {
  const [otherId, setOtherId] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    socket.on("chat", (payload) => {
      setChat(prev => [...prev, payload]);
    });

    socket.on("call-made", async (data) => {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("make-answer", { answer, to: data.from });
    });

    socket.on("answer-made", async (data) => {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on("ice-candidate", (data) => {
      peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    return () => {
      socket.off("chat");
      socket.off("call-made");
      socket.off("answer-made");
      socket.off("ice-candidate");
    };
  }, []);

  const sendChat = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const payload = { id: myId, message, time: new Date().toLocaleTimeString() };
    socket.emit('chat', payload);
    setMessage('');
  };

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    peerRef.current = new RTCPeerConnection();

    stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

    peerRef.current.ontrack = ({ streams: [remoteStream] }) => {
      remoteVideoRef.current.srcObject = remoteStream;
    };

    peerRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { candidate: e.candidate, to: otherId });
      }
    };

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    socket.emit("call-user", { offer, to: otherId });
  };

  return (
    <div className="App">
      <header>
        <div className="user-id">Your ID: {myId}</div>
        <div>
          <input value={otherId} onChange={e => setOtherId(e.target.value)} placeholder="Other ID" />
          <button onClick={startCall}>Call</button>
        </div>
      </header>

      <div className="messages">
        {chat.map((c, idx) => (
          <div key={idx} className={`message ${c.id === myId ? 'self' : 'other'}`}>
            <div className="meta">{c.id} • {c.time}</div>
            {c.message}
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={sendChat}>
        <input
          placeholder="Type a message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>

      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted playsInline></video>
        <video ref={remoteVideoRef} autoPlay playsInline></video>
      </div>
    </div>
  );
}

export default App;
