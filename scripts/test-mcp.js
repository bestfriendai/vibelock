#!/usr/bin/env node

const https = require('https');

const MCP_URL = 'mcp.revenuecat.ai';
const API_KEY = 'sk_NwaebOrtgTNIWxHRYqbMFkxYNmXlf';

function makeMCPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: `tools/call`,
      params: {
        name: method,
        arguments: params
      }
    });

    console.log('Request:', data);

    const options = {
      hostname: MCP_URL,
      port: 443,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('Raw response:', responseData);
        
        try {
          // Handle Server-Sent Events format
          if (responseData.startsWith('event: message\ndata: ')) {
            const jsonData = responseData.split('data: ')[1];
            console.log('JSON data:', jsonData);
            const parsed = JSON.parse(jsonData);
            console.log('Parsed result:', JSON.stringify(parsed, null, 2));
            resolve(parsed.result);
          } else {
            const parsed = JSON.parse(responseData);
            console.log('Direct parsed:', JSON.stringify(parsed, null, 2));
            if (parsed.error) {
              reject(new Error(`MCP Error: ${JSON.stringify(parsed.error)}`));
            } else {
              resolve(parsed.result);
            }
          }
        } catch (e) {
          console.error('Parse error:', e);
          reject(new Error(`Parse Error: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testMCP() {
  try {
    console.log('Testing MCP get_project...');
    const result = await makeMCPRequest('mcp_RC_get_project');
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMCP();
