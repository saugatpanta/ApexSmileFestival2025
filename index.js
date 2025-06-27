// This file makes Vercel treat the api directory as Serverless Functions
module.exports = (req, res) => {
  res.status(404).json({ message: 'Not found' });
};
