import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authenticateAdmin } from './lib/auth/authenticate-admin.js';
import { HttpError } from './lib/auth/token-exchange.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    console.log(req)
    res.send({ message: 'It is working!' });
});

app.get('/products', async (req, res) => {
    try {
        const { client } = await authenticateAdmin(req);

        const data = await client.request(`{
            products(first: 10) {
                edges {
                    node {
                        id
                        title
                    }
                }
            }
        }`);

        res.send({ data });
    } catch (error) {
        console.error(error);

        if (error instanceof HttpError) {
            for (const [header, value] of Object.entries(error.headers)) {
                res.setHeader(header, value);
            }

            return res.status(error.status).send({ error: error.message });
        }

        res.status(500).send({ error: error.message || 'Failed to get products' });
    }
});

app.listen(3000, () => console.log('App listening on port 3000'));
