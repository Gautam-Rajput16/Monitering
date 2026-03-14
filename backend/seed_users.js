require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Check if users exist:
        const count = await User.countDocuments();
        if (count > 0) {
            console.log(`There are already ${count} users in the database.`);
            // if we want to delete them -> await User.deleteMany({});
        }

        const usersToInsert = [
            {
                email: 'admin@spy.com',
                password: 'password123',
                role: 'admin',
                status: 'offline',
            },
            {
                email: 'user1@spy.com',
                password: 'password123',
                role: 'user',
                status: 'offline',
            },
            {
                email: 'user2@spy.com',
                password: 'password123',
                role: 'user',
                status: 'offline',
            }
        ];

        // Ensure we don't insert duplicates
        for (const u of usersToInsert) {
            const existing = await User.findOne({ email: u.email });
            if (!existing) {
                const newUser = new User(u);
                await newUser.save(); // this will run the pre-save hook to hash password
                console.log(`Inserted user: ${u.email}`);
            } else {
                console.log(`User already exists: ${u.email}`);
            }
        }

        console.log('Dummy users seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
