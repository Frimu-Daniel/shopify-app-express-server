import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('<h1>Request has been sent</h1>');
});

app.listen(3000, () => console.log('App listening on port 3000'));
