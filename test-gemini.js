const { LlmAgent, InMemoryRunner } = require('@google/adk');
require('dotenv').config();

async function test() {
  console.log('Testing with key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
  const agent = new LlmAgent({
    name: 'Test',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    instruction: 'Say "hello world".'
  });
  
  const runner = new InMemoryRunner({ agent });
  
  try {
    const stream = runner.runAsync({
      userId: 'test',
      sessionId: 'test',
      newMessage: { role: 'user', parts: [{ text: 'hola' }] }
    });
    
    for await (const event of stream) {
      console.log('EVENT:', JSON.stringify(event));
    }
    console.log('Done.');
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

test();
