import { healthCheck } from './registrations';

export default async function handler(req, res) {
  try {
    const health = await healthCheck();
    return res.status(200).json(health);
  } catch (error) {
    return res.status(500).json({ status: 'down', error: error.message });
  }
}
