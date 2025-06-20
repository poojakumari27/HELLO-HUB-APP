import './App.css';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { nanoid } from 'nanoid';

const socket = io.connect("http://localhost:5001");

const userName = "User-" + nanoid(3);

function App() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  const sendChat = (e) => {
    e.preventDefault();
    if (message.trim() === '') return;
    const payload = { id: nanoid(), userName, message, time: new Date().toLocaleTimeString() };
    socket.emit('chat', payload);
    setMessage('');
  };

  useEffect(() => {
    socket.on('chat', (payload) => {
      setChat((prev) => [...prev, payload]);
    });
    return () => socket.off('chat');
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 HELLO HUB</h1>
        <p className="quote">"Start the conversation, one message at a time!"</p>

        <div className="chat-box">
          {chat.map((item) => (
            <div className="chat-message" key={item.id}>
              <span className="user">{item.userName}</span>: 
              <span className="text">{item.message}</span>
              <span className="time">({item.time})</span>
            </div>
          ))}
        </div>

        <form onSubmit={sendChat}>
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit">SEND</button>
        </form>
      </header>
    </div>
  );
}

export default App;
