export const config = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  port: parseInt(process.env.PORT || '5001'),
  clientUrl: process.env.CLIENT_URL || 'https://restaurant-pos-61y5.vercel.app',
  taxRate: 0.05, // 5% GST
};
