// mention-all.js
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');


const client = new Client();
client.on('qr', qr => {
  console.log('[DEBUG] QR code received');
  qrcode.generate(qr, {small: true});
});
client.on('ready', () => console.log('[DEBUG] Client is ready'));


client.on('message_create', async msg => {
  // Only process outgoing messages (messages sent by the bot user)
  if (msg.fromMe && msg.body === '!everyone') {
    console.log('[DEBUG] !everyone command detected');
    
    try {
      // For outgoing messages, use msg.to to get the chat
      const chatId = msg.to || msg.from;
      const chat = await client.getChatById(chatId);
      
      if (!chat.isGroup) {
        console.log('[DEBUG] Not a group chat');
        return;
      }
      
      // Get all participants and create mentions
      const participants = chat.participants.map(p => p.id._serialized);
      const text = 'Attention everyone! 📢';
      
      await chat.sendMessage(text, { mentions: participants });
      console.log('[DEBUG] Message with mentions sent successfully');
      
    } catch (error) {
      console.error('[DEBUG] Error:', error);
    }
  }
});

console.log('[DEBUG] Initializing client...');
client.initialize();
