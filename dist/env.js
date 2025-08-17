import 'dotenv/config';
import { z } from 'zod';
const EnvSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(24),
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
    CORS_ORIGIN: z.string().optional()
});
export const env = EnvSchema.parse(process.env);
//# sourceMappingURL=env.js.map