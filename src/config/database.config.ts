import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const useSsl =
    process.env.DB_SSL === 'true' ||
    (Boolean(process.env.DATABASE_URL) && !process.env.DATABASE_URL?.includes('localhost'));

  return {
    type: 'postgres',
    url: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'uci_monitoring_db',
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNCHRONIZE ? process.env.DB_SYNCHRONIZE === 'true' : true,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
});
