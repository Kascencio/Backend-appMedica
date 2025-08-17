import bcrypt from 'bcrypt';
export const hash = (s) => bcrypt.hash(s, 10);
export const compare = (s, h) => bcrypt.compare(s, h);
//# sourceMappingURL=hash.js.map