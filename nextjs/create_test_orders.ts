import mongoose from 'mongoose';
import OrderModel from './src/lib/db/models/Order.js';
import UserModel from './src/lib/db/models/User.js';
import ProductModel from './src/lib/db/models/Product.js';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/pagineazzurre');

  const mario = await UserModel.findOne({ email: 'mario@example.com' });
  const giulia = await UserModel.findOne({ email: 'giulia@example.com' });

  if (!mario || !giulia) {
    console.error('Users not found');
    process.exit(1);
  }

  console.log(`Mario ID: ${mario._id}`);
  console.log(`Giulia ID: ${giulia._id}`);

  // Get products
  const marioProduct = await ProductModel.findOne({ seller: mario._id });
  const giuliaProduct = await ProductModel.findOne({ seller: giulia._id });

  // Clear existing orders
  await OrderModel.deleteMany({});

  // Create orders for Mario's products (sold by Mario)
  const marioOrder = await OrderModel.create({
    seller: mario._id,
    user: giulia._id, // Giulia buys from Mario
    orderItems: [
      {
        product: marioProduct?._id,
        name: marioProduct?.name || 'Product 1',
        qty: 2,
        priceVal: 15,
        priceEuro: 25,
        image: ['/images/test.jpg'],
        seller: mario._id,
      },
    ],
    shippingAddress: {
      fullName: 'Giulia Bianchi',
      address: '123 Via Milano',
      city: 'Milano',
      postalCode: '20100',
      country: 'Italia',
    },
    paymentMethod: 'Carta',
    itemsPriceVal: 30,
    itemsPriceEuro: 50,
    totalPriceVal: 30,
    totalPriceEuro: 50,
    shippingPrice: 0,
    isPaid: false,
    isDelivered: false,
  });

  // Create orders for Giulia's products (sold by Giulia)
  const giuliaOrder = await OrderModel.create({
    seller: giulia._id,
    user: mario._id, // Mario buys from Giulia
    orderItems: [
      {
        product: giuliaProduct?._id,
        name: giuliaProduct?.name || 'Product 2',
        qty: 1,
        priceVal: 80,
        priceEuro: 150,
        image: ['/images/test2.jpg'],
        seller: giulia._id,
      },
    ],
    shippingAddress: {
      fullName: 'Mario Rossi',
      address: '456 Via Roma',
      city: 'Roma',
      postalCode: '00100',
      country: 'Italia',
    },
    paymentMethod: 'PayPal',
    itemsPriceVal: 80,
    itemsPriceEuro: 150,
    totalPriceVal: 80,
    totalPriceEuro: 150,
    shippingPrice: 0,
    isPaid: false,
    isDelivered: false,
  });

  console.log('\nOrders created:');
  console.log(`  - Order ${marioOrder._id} (sold by Mario, bought by Giulia)`);
  console.log(`  - Order ${giuliaOrder._id} (sold by Giulia, bought by Mario)`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(console.error);
