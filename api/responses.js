import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const RESPONSES_KEY = 'weitzel_responses';
const CUSTOMS_KEY = 'weitzel_customs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const [responses, customs] = await Promise.all([
      redis.get(RESPONSES_KEY).catch(() => null),
      redis.get(CUSTOMS_KEY).catch(() => null),
    ]);
    return res.status(200).json({
      responses: responses || [],
      customs: customs || [],
    });
  }

  if (req.method === 'POST') {
    const { type, payload } = req.body;

    if (type === 'submit_response') {
      const { name, activityVotes, availability } = payload;
      let responses = await redis.get(RESPONSES_KEY).catch(() => null) || [];
      responses = responses.filter(r => r.name.toLowerCase() !== name.toLowerCase());
      responses.push({ name, activityVotes, availability, submittedAt: new Date().toISOString() });
      await redis.set(RESPONSES_KEY, responses);
      return res.status(200).json({ ok: true });
    }

    if (type === 'add_custom') {
      const { activity } = payload;
      let customs = await redis.get(CUSTOMS_KEY).catch(() => null) || [];
      if (!customs.find(c => c.id === activity.id)) {
        customs.push(activity);
        await redis.set(CUSTOMS_KEY, customs);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown type' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
