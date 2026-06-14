import express from 'express';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';

const app = express();
app.use(express.json());

const gateway = createGatewayMiddleware({
  sellerAddress: '0x656cDff13D9076325774E80Ac617b403127a8A85',
  facilitatorUrl: 'https://gateway-api.circle.com',
});

app.post('/api/analyze', gateway.require('$0.01'), async (req, res) => {
  try {
    const response = await fetch('https://y-delta-lake.vercel.app/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', wallet: '0x656cDff13D9076325774E80Ac617b403127a8A85' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('FlagCheck paid API running on port ' + PORT));