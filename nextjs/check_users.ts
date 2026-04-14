import mongoose from 'mongoose';
import UserModel from './src/lib/db/models/User.js';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/pagineazzurre');
  const users = await UserModel.find({}, 'email username isSeller isAdmin').lean();
  console.log('Users in database:');
  console.log(JSON.stringify(users, null, 2));
  await mongoose.disconnect();
}

main();
