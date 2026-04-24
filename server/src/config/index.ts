export const config = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  port: parseInt(process.env.PORT || '5001'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5050',
  taxRate: 0.05, // 5% GST
};
