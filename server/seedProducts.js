
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Product from './models/Product.js';

const products = [
  {
    name: 'Custom Vinyl Stickers',
    slug: 'custom-vinyl-stickers',
    division: 'labels-stickers',
    description: 'Durable custom vinyl stickers for branding and packaging.',
    configuration: {
      shapes: ['Circle', 'Square', 'Custom'],
      finishes: ['Gloss', 'Matte'],
    },
    pricing: {
      basePrice: 5,
      currency: 'INR',
      unit: 'piece',
    },
  },
  {
    name: 'Custom Race Bib Numbers',
    slug: 'custom-race-bib-numbers',
    division: 'race-event-numbers',
    description: 'Custom printed race bibs for sporting events.',
    configuration: {
      materials: ['Paper', 'Synthetic'],
      sizes: ['A5', 'A6'],
    },
    pricing: {
      basePrice: 15,
      currency: 'INR',
      unit: 'piece',
    },
  },
  {
    name: 'MTB Number Board',
    slug: 'mtb-number-board',
    division: 'mtb-boards',
    description: 'Personalised mountain bike number boards.',
    configuration: {
      materials: ['Plastic'],
      shapes: ['Standard', 'Custom'],
    },
    pricing: {
      basePrice: 150,
      currency: 'INR',
      unit: 'piece',
    },
  },
  {
    name: 'Custom Business Stamp',
    slug: 'custom-business-stamp',
    division: 'stamps',
    description: 'Custom business stamps with your branding and details.',
    configuration: {
      types: ['Self-inking', 'Rubber'],
      sizes: ['Small', 'Medium', 'Large'],
    },
    pricing: {
      basePrice: 250,
      currency: 'INR',
      unit: 'piece',
    },
  },
  {
    name: 'Personalised Trophy',
    slug: 'personalised-trophy',
    division: 'trophies',
    description: 'Personalised trophies for events and achievements.',
    configuration: {
      materials: ['Acrylic', 'Wood'],
      sizes: ['Small', 'Medium', 'Large'],
    },
    pricing: {
      basePrice: 500,
      currency: 'INR',
      unit: 'piece',
    },
  },
  {
    name: 'Custom Laser Cut Sign',
    slug: 'custom-laser-cut-sign',
    division: 'laser-cut-work',
    description: 'Precision laser-cut signs for businesses and creative projects.',
    configuration: {
      materials: ['Acrylic', 'Wood'],
      thickness: ['3mm', '5mm'],
    },
    pricing: {
      basePrice: 300,
      currency: 'INR',
      unit: 'piece',
    },
  },
];

const seedProducts = async () => {
  try {
    await connectDB();

    for (const product of products) {
      await Product.updateOne(
        { slug: product.slug },
        { $set: product },
        { upsert: true, runValidators: true }
      );
    }

    console.log('Sample products seeded successfully!');
    console.log(`Processed ${products.length} products.`);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedProducts();
