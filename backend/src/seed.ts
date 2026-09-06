import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from './database/entities/product.entity';
import { KeyPool } from './database/entities/key-pool.entity';
import { PromoCode } from './database/entities/promo-code.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'store_user',
    password: process.env.DATABASE_PASSWORD || 'store_pass_123',
    database: process.env.DATABASE_NAME || 'digitalstore',
    entities: [Product, KeyPool, PromoCode],
    synchronize: true,
  });

  await dataSource.initialize();
  const productRepo = dataSource.getRepository(Product);
  const keyPoolRepo = dataSource.getRepository(KeyPool);
  const promoCodeRepo = dataSource.getRepository(PromoCode);

  const products = [
    { name: 'Steam Wallet 500₽', description: 'Пополнение кошелька Steam на 500 рублей', price: 500, category: 'wallet', service: 'steam' },
    { name: 'Steam Wallet 1000₽', description: 'Пополнение кошелька Steam на 1000 рублей', price: 1000, category: 'wallet', service: 'steam' },
    { name: 'Steam Gift Card $20', description: 'Подарочная карта Steam на $20 USD', price: 20, category: 'gift_card', service: 'steam' },
    { name: 'Epic Games Gift Card $25', description: 'Подарочная карта Epic Games на $25 USD', price: 25, category: 'gift_card', service: 'epic_games' },
    { name: 'Xbox Game Pass Ultimate 1 Month', description: 'Подписка Xbox Game Pass Ultimate на 1 месяц', price: 15, category: 'subscription', service: 'xbox' },
    { name: 'PlayStation Plus Essential 3 Months', description: 'Подписка PlayStation Plus Essential на 3 месяца', price: 22, category: 'subscription', service: 'playstation' },
    { name: 'Razer Gold $10', description: 'Подарочная карта Razer Gold на $10 USD', price: 10, category: 'gift_card', service: 'razer' },
    { name: 'Google Play $15', description: 'Подарочная карта Google Play на $15 USD', price: 15, category: 'gift_card', service: 'google_play' },
  ];

  for (const p of products) {
    await productRepo.save(p);
  }

  const promos = [
    { code: 'WELCOME10', discountPercent: 10, maxUses: 100, isActive: true },
    { code: 'GAMER20', discountPercent: 20, maxUses: 50, isActive: true },
    { code: 'SUMMER5', discountPercent: 5, maxUses: 200, isActive: true },
    { code: 'VIP30', discountPercent: 30, maxUses: 10, isActive: true },
  ];

  for (const pc of promos) {
    await promoCodeRepo.save(pc);
  }

  const productList = await productRepo.find();
  for (const prod of productList) {
    const keyCount = Math.floor(Math.random() * 50) + 20;
    const keys = [];
    for (let i = 0; i < keyCount; i++) {
      keys.push(generateKey(prod.service));
    }
    await keyPoolRepo.insert(keys.map(k => ({ productId: prod.id, keyValue: k, isUsed: false })));
  }

  Logger.log('Database seeded successfully!', 'Seed');
  await dataSource.destroy();
}

function generateKey(service: string): string {
  const prefix = service.toUpperCase().substring(0, 4);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = prefix + '-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  return key;
}

seed().catch((e) => Logger.error(e instanceof Error ? e.message : e, undefined, 'Seed'));
