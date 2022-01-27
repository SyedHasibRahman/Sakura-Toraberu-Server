const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
require('dotenv').config();
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;


const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware 
app.use(cors());
app.use(express.json());
router.use(cors());




// MongoD 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uqwrr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        // console.log(token);
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('SyedBabyCare');
        const productCollection = database.collection('products3');
        const reviewsCollection = database.collection('reviews3');
        const ordersCollection = database.collection('orders');
        const usersCollection = database.collection('users');
        const blogsCollection = database.collection('blogs');


        app.put('/updateStatus/:id', (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const updatedStatus = req.body.status;
            console.log(updatedStatus);
            const result = ordersCollection.updateOne(filter, {
                $set: { status: updatedStatus },
            })
                .then(result => {
                    res.send(result)
                })
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            console.log('Deleteing', id, query);
            res.json(result);
        })
        // GET Order API 
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.json(orders);

        })
        // GET Order API 
        app.get('/myorders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);

        })

        // POST Order API 
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            console.log('hit', orders);
            const result = await ordersCollection.insertOne(orders);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            // console.log('put', req.decodedEmail);
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({
                    message: 'You Do not have access to make Admin'
                })
            }



        });


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            console.log('put', req.decodedEmail);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });


        // GET Blogs API 
        app.get('/blogs', async (req, res) => {
            const cursor = blogsCollection.find({});
            const blogs = await cursor.toArray();
            res.send(blogs);
        })

        // POST Products API 
        app.post('/products3', async (req, res) => {
            const products = req.body;
            console.log('hit', products);
            const result = await productCollection.insertOne(products);
            console.log(result);
            res.json(result);
        });
        // Delete API 
        app.delete('/products3/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            // console.log('Deleteing', id, result);
            res.json(result);
        })
        // GET Products API 
        app.get('/products3', async (req, res) => {
            const cursor = productCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/products3forhome', async (req, res) => {
            const cursor = productCollection.find({}).limit(6);
            const products = await cursor.toArray();
            res.send(products);
        });
        // POST reviews API 
        app.post('/reviews3', async (req, res) => {
            const reviews = req.body;
            console.log('hit', reviews);
            const result = await reviewsCollection.insertOne(reviews);
            // console.log(result);
            res.json(result);
        });
        // GET Reviews API 
        app.get('/reviews3', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        // POST USER 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            // console.log(result);
            res.json(result);
        });
    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Runnig my CURD Server');
});

app.listen(port, () => {
    console.log('Running Server on port', port);
})