const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const CHANNEL_ID = '1201549785606398074';
let messages = [];

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
  if (message.channel.id === CHANNEL_ID && !message.author.bot) {
    const newMessage = {
      id: message.id,
      author: message.author.username,
      content: message.content,
      timestamp: message.createdTimestamp
    };
    messages.push(newMessage);
    io.emit('message', newMessage);
  }
});

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/app.html');
});

app.get('/', (req, res) => {
  res.send('Welcome to the Discord Chat App!');
});

app.delete('/delete/:id', async (req, res) => {
  const messageId = req.params.id;
  messages = messages.filter(msg => msg.id !== messageId);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const message = await channel.messages.fetch(messageId);
    await message.delete();
    io.emit('delete', messageId);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting message:', error);
    res.sendStatus(500);
  }
});

app.post('/send', async (req, res) => {
  const { content, username } = req.body;

  if (!content || !username) {
    return res.sendStatus(400);
  }

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const sentMessage = await channel.send(content);
    const newMessage = {
      id: sentMessage.id,
      author: username,
      content: content,
      timestamp: sentMessage.createdTimestamp
    };
    messages.push(newMessage);
    io.emit('message', newMessage);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error sending message:', error);
    res.sendStatus(500);
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('init', messages);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

client.login('MTIwNDk0NzYxODU5NDAyOTU4OQ.G4HeuM.hJm-wNOSC7cb_KrbkPKEZM_YZfzOQc1XMz3J-o');

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
