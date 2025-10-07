/**
 * Simple test for random User-Agent
 */

import UserAgent from 'user-agents';

console.log('🧪 Testing user-agents package\n');

// Generate 5 random user agents
console.log('Generating 5 random User-Agents:\n');
for (let i = 1; i <= 5; i++) {
  const userAgent = new UserAgent();
  console.log(`${i}. ${userAgent.toString()}`);
}

console.log('\n✅ user-agents package working correctly!');
