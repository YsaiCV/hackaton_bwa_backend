import { LlmAgent, InMemoryRunner } from '@google/adk';

async function test() {
  console.log('Testing ADK...');
  const agent = new LlmAgent({
    name: 'Test',
    model: 'gemini-2.0-flash',
    instruction: 'Say "hello world".'
  });
  
  const runner = new InMemoryRunner({ agent, appName: 'test_app' });
  
  try {
    await runner.sessionService.createSession({
      appName: 'test_app',
      userId: 'test',
      sessionId: 'test',
      state: {}
    });
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
