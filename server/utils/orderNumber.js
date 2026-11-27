import crypto from 'crypto';

export const generateOrderNumber = () =>
  `DH-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;