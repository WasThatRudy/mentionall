const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  console.log('[DEBUG] QR code received');
  qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
  console.log('[DEBUG] Client is ready!');
});

// Helper function to add timeout to any promise
function withTimeout(promise, timeoutMs, errorMessage) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

client.on('message_create', async msg => {
  if (msg.fromMe && msg.body === '!everyone') {
    console.log('[DEBUG] !everyone command detected');
    console.log('[DEBUG] Message from:', msg.from, 'to:', msg.to);
    
    try {
      // Try multiple approaches with timeouts
      
      // Approach 1: msg.getChat() with timeout
      console.log('[DEBUG] Trying msg.getChat() with 10 second timeout...');
      let chat;
      try {
        chat = await withTimeout(
          msg.getChat(), 
          10000, 
          'msg.getChat() timeout after 10 seconds'
        );
        console.log('[DEBUG] msg.getChat() succeeded!');
      } catch (error) {
        console.log('[DEBUG] msg.getChat() failed:', error.message);
        
        // Approach 2: client.getChatById() with timeout
        console.log('[DEBUG] Trying client.getChatById() with 10 second timeout...');
        const chatId = msg.to || msg.from;
        try {
          chat = await withTimeout(
            client.getChatById(chatId),
            10000,
            'client.getChatById() timeout after 10 seconds'
          );
          console.log('[DEBUG] client.getChatById() succeeded!');
        } catch (error2) {
          console.log('[DEBUG] client.getChatById() also failed:', error2.message);
          
          // Approach 3: Try to send a simple message directly
          console.log('[DEBUG] Trying direct message send...');
          try {
            await withTimeout(
              client.sendMessage(msg.to || msg.from, 'Test message - checking if basic send works'),
              10000,
              'Direct sendMessage timeout'
            );
            console.log('[DEBUG] Direct message send worked, but chat retrieval is broken');
            return;
          } catch (error3) {
            console.log('[DEBUG] Even direct send failed:', error3.message);
            return;
          }
        }
      }
      
      console.log('[DEBUG] Chat retrieved, checking if it\'s a group...');
      
      if (!chat.isGroup) {
        console.log('[DEBUG] Not a group chat');
        await withTimeout(
          chat.sendMessage('❌ This command only works in group chats!'),
          10000,
          'Send error message timeout'
        );
        return;
      }
      
      console.log('[DEBUG] Getting participants with timeout...');
      
      let participants = [];
      
      try {
        if (chat.participants && chat.participants.length > 0) {
          console.log('[DEBUG] Using chat.participants');
          participants = chat.participants.map(p => p.id._serialized);
        } else {
          console.log('[DEBUG] Getting group metadata...');
          const groupMetadata = await withTimeout(
            client.getGroupMetadata(chat.id._serialized),
            10000,
            'getGroupMetadata timeout'
          );
          participants = groupMetadata.participants.map(p => p.id._serialized);
        }
      } catch (participantError) {
        console.log('[DEBUG] Failed to get participants:', participantError.message);
        // Send message without mentions
        await chat.sendMessage('Attention everyone! 📢 (Unable to get participant list for mentions)');
        return;
      }
      
      console.log('[DEBUG] Found', participants.length, 'participants');
      
      const text = 'Attention everyone! 📢';
      console.log('[DEBUG] Sending message with mentions...');
      
      const result = await withTimeout(
        chat.sendMessage(text, { mentions: participants }),
        10000,
        'Send message with mentions timeout'
      );
      
      console.log('[DEBUG] Success! Message sent:', result.id);
      
    } catch (error) {
      console.error('[DEBUG] Final error:', error.message);
    }
  }
});

// Add more event listeners to debug connection issues
client.on('authenticated', () => {
  console.log('[DEBUG] Client authenticated successfully');
});

client.on('auth_failure', msg => {
  console.error('[DEBUG] Authentication failed:', msg);
});

client.on('disconnected', reason => {
  console.log('[DEBUG] Client disconnected:', reason);
});

client.on('change_state', state => {
  console.log('[DEBUG] Client state changed:', state);
});

console.log('[DEBUG] Initializing client...');
client.initialize();