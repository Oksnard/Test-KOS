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
    // Steam
    { name: 'Steam Wallet 500₽', description: 'Пополнение кошелька Steam на 500 рублей', price: 500, category: 'wallet', service: 'steam' },
    { name: 'Steam Wallet 1000₽', description: 'Пополнение кошелька Steam на 1000 рублей', price: 1000, category: 'wallet', service: 'steam' },
    { name: 'Steam Wallet 2000₽', description: 'Пополнение кошелька Steam на 2000 рублей', price: 2000, category: 'wallet', service: 'steam' },
    { name: 'Steam Gift Card $20', description: 'Подарочная карта Steam на $20 USD', price: 20, category: 'gift_card', service: 'steam' },
    { name: 'Steam Gift Card $50', description: 'Подарочная карта Steam на $50 USD', price: 50, category: 'gift_card', service: 'steam' },
    { name: 'Steam Deoxycholic Acid', description: 'Ограниченная коллекция Steam', price: 99, category: 'gift_card', service: 'steam' },
    { name: 'Steam CS2 Prime Status', description: 'Prime Status для Counter-Strike 2', price: 10, category: 'subscription', service: 'steam' },
    { name: 'Steam Dota 2 Treasure', description: 'Сокровище Dota 2 с уникальными предметами', price: 15, category: 'gift_card', service: 'steam' },

    // Epic Games
    { name: 'Epic Games Gift Card $25', description: 'Подарочная карта Epic Games на $25 USD', price: 25, category: 'gift_card', service: 'epic_games' },
    { name: 'Epic Games Gift Card $50', description: 'Подарочная карта Epic Games на $50 USD', price: 50, category: 'gift_card', service: 'epic_games' },
    { name: 'Epic Games Fortnite V-Bucks 1000', description: '1000 V-Bucks для Fortnite', price: 8, category: 'subscription', service: 'epic_games' },
    { name: 'Epic Games Fortnite V-Bucks 2800', description: '2800 V-Bucks для Fortnite', price: 20, category: 'subscription', service: 'epic_games' },
    { name: 'Epic Games Fortnite V-Bucks 5000', description: '5000 V-Bucks для Fortnite', price: 32, category: 'subscription', service: 'epic_games' },

    // Xbox
    { name: 'Xbox Game Pass Ultimate 1 Month', description: 'Подписка Xbox Game Pass Ultimate на 1 месяц', price: 15, category: 'subscription', service: 'xbox' },
    { name: 'Xbox Game Pass Ultimate 3 Months', description: 'Подписка Xbox Game Pass Ultimate на 3 месяца', price: 40, category: 'subscription', service: 'xbox' },
    { name: 'Xbox Game Pass Core 12 Months', description: 'Подписка Xbox Game Pass Core на 12 месяцев', price: 60, category: 'subscription', service: 'xbox' },
    { name: 'Xbox Gift Card $25', description: 'Подарочная карта Xbox на $25 USD', price: 25, category: 'gift_card', service: 'xbox' },
    { name: 'Xbox Gift Card $50', description: 'Подарочная карта Xbox на $50 USD', price: 50, category: 'gift_card', service: 'xbox' },
    { name: 'Xbox Call of Duty MVP Pack', description: 'MVP Pack для Call of Duty', price: 12, category: 'gift_card', service: 'xbox' },

    // PlayStation
    { name: 'PlayStation Plus Essential 3 Months', description: 'Подписка PlayStation Plus Essential на 3 месяца', price: 22, category: 'subscription', service: 'playstation' },
    { name: 'PlayStation Plus Extra 12 Months', description: 'Подписка PlayStation Plus Extra на 12 месяцев', price: 60, category: 'subscription', service: 'playstation' },
    { name: 'PlayStation Plus Premium 12 Months', description: 'Подписка PlayStation Plus Premium на 12 месяцев', price: 80, category: 'subscription', service: 'playstation' },
    { name: 'PlayStation Gift Card $25', description: 'Подарочная карта PlayStation на $25 USD', price: 25, category: 'gift_card', service: 'playstation' },
    { name: 'PlayStation Gift Card $50', description: 'Подарочная карта PlayStation на $50 USD', price: 50, category: 'gift_card', service: 'playstation' },
    { name: 'PlayStation GTA V Premium', description: 'Premium Edition для GTA V на PlayStation', price: 30, category: 'gift_card', service: 'playstation' },

    // Razer
    { name: 'Razer Gold $10', description: 'Подарочная карта Razer Gold на $10 USD', price: 10, category: 'gift_card', service: 'razer' },
    { name: 'Razer Gold $25', description: 'Подарочная карта Razer Gold на $25 USD', price: 25, category: 'gift_card', service: 'razer' },
    { name: 'Razer Gold $50', description: 'Подарочная карта Razer Gold на $50 USD', price: 50, category: 'gift_card', service: 'razer' },
    { name: 'Razer Silver $15', description: 'Подарочная карта Razer Silver на $15 USD', price: 15, category: 'gift_card', service: 'razer' },

    // Google Play
    { name: 'Google Play $15', description: 'Подарочная карта Google Play на $15 USD', price: 15, category: 'gift_card', service: 'google_play' },
    { name: 'Google Play $25', description: 'Подарочная карта Google Play на $25 USD', price: 25, category: 'gift_card', service: 'google_play' },
    { name: 'Google Play $50', description: 'Подарочная карта Google Play на $50 USD', price: 50, category: 'gift_card', service: 'google_play' },
    { name: 'Google Play YouTube Premium', description: 'YouTube Premium на 3 месяца', price: 20, category: 'subscription', service: 'google_play' },

    // Apple
    { name: 'App Store & iTunes $15', description: 'Подарочная карта App Store и iTunes на $15 USD', price: 15, category: 'gift_card', service: 'appstore' },
    { name: 'App Store & iTunes $25', description: 'Подарочная карта App Store и iTunes на $25 USD', price: 25, category: 'gift_card', service: 'appstore' },
    { name: 'App Store & iTunes $50', description: 'Подарочная карта App Store и iTunes на $50 USD', price: 50, category: 'gift_card', service: 'appstore' },
    { name: 'Apple Arcade 3 Months', description: 'Подписка Apple Arcade на 3 месяца', price: 18, category: 'subscription', service: 'appstore' },
    { name: 'Apple Music 12 Months', description: 'Подписка Apple Music на 12 месяцев', price: 100, category: 'subscription', service: 'appstore' },

    // iTunes
    { name: 'iTunes $10', description: 'Подарочная карта iTunes на $10 USD', price: 10, category: 'gift_card', service: 'itunes' },
    { name: 'iTunes $15', description: 'Подарочная карта iTunes на $15 USD', price: 15, category: 'gift_card', service: 'itunes' },
    { name: 'iTunes $25', description: 'Подарочная карта iTunes на $25 USD', price: 25, category: 'gift_card', service: 'itunes' },
    { name: 'iTunes Apple TV+ 1 Year', description: 'Подписка Apple TV+ на 1 год', price: 40, category: 'subscription', service: 'itunes' },
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
    let keyCount: number;
    if (prod.name.includes('Deoxycholic') || prod.name.includes('GTA V')) {
      keyCount = 1;
    } else if (prod.name.includes('Prime Status')) {
      keyCount = 3;
    } else {
      keyCount = Math.floor(Math.random() * 50) + 20;
    }

    const keys = [];
    for (let i = 0; i < keyCount; i++) {
      keys.push(generateKey(prod.service));
    }
    await keyPoolRepo.insert(keys.map(k => ({ productId: prod.id, keyValue: k, isUsed: false })));
  }

  Logger.log(`Database seeded: ${products.length} products, ${promos.length} promo codes`, 'Seed');
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
