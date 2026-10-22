// Утилита: npm run hash-password -- <пароль>  → строка для поля passwordHash в server/users.mjs
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Использование: npm run hash-password -- <пароль>');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
console.log(`${salt}:${scryptSync(password, salt, 32).toString('hex')}`);
