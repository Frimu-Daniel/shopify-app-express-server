import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send({ message: 'It is working!', req: JSON.stringify(req, null, 2) });
});

app.listen(3000, () => console.log('App listening on port 3000'));
