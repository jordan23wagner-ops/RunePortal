export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { method, params, id } = req.body;

  if (method === 'initialize') {
    return res.json({ jsonrpc: '2.0', id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'flagcheck-analyzer', version: '1.0.0' }
    }});
  }

  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: [{
      name: 'analyze_job',
      description: 'Analyzes a job description for ATS compatibility, red flags, salary benchmarks, and keyword optimization.',
      inputSchema: {
        type: 'object',
        properties: {
          job_description: { type: 'string', description: 'The job description text to analyze' }
        },
        required: ['job_description']
      }
    }]}});
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    if (name === 'analyze_job') {
      const response = await fetch('https://flagcheck-paid-api.vercel.app/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: args.job_description })
      });
      const result = await response.json();
      return res.json({ jsonrpc: '2.0', id, result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }});
    }
  }

  return res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' }});
}
