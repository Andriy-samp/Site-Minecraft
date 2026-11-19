const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('ОШИБКА: Не задана переменная MONGODB_URI');
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let db, usersCollection, boardCollection;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('spacetime');
        usersCollection = db.collection('users');
        boardCollection = db.collection('board');

        const userCount = await usersCollection.countDocuments();
        if (userCount === 0) {
            await usersCollection.insertMany([
                { username: 'K1nzy', password: '123456', role: 'superadmin' },
                { username: 'ZombieMainer', password: '123456', role: 'superadmin' }
            ]);
            console.log('Созданы начальные админы.');
        }
        console.log('Подключение к MongoDB Atlas успешно!');
    } catch (err) {
        console.error('КРИТИЧЕСКАЯ ОШИБКА БАЗЫ ДАННЫХ:', err.message);
    }
}
connectDB();

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/login', async (req, res) => {
    try {
        if (!usersCollection) return res.status(500).json({ success: false, message: 'База данных не подключена' });

        const { username, password } = req.body;
        const user = await usersCollection.findOne({
            username: { $regex: new RegExp(`^${username}$`, 'i') },
            password: password
        });

        if (user) {
            res.json({ success: true, token: 'token_' + user.username, role: user.role, username: user.username });
        } else {
            res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
    } catch (e) {
        console.error('Ошибка при входе:', e);
        res.status(500).json({ success: false, message: 'Ошибка сервера: ' + e.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        if (!usersCollection) return res.status(500).json({ success: false, message: 'База данных не подключена' });

        const { username, password } = req.body;
        const existing = await usersCollection.findOne({
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Этот логин уже занят' });
        }

        await usersCollection.insertOne({ username, password, role: 'player' });
        res.json({ success: true, message: 'Успешная регистрация' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.get('/api/board', async (req, res) => {
    try {
        if (!boardCollection) return res.json({ boardData: null });
        const boardDoc = await boardCollection.findOne({ _id: 'main' });
        res.json({ boardData: boardDoc ? boardDoc.html : null });
    } catch (e) {
        res.json({ boardData: null });
    }
});

app.post('/api/board', async (req, res) => {
    try {
        if (!usersCollection || !boardCollection) return res.status(500).json({ success: false, message: 'База данных не подключена' });

        const token = req.headers.authorization;
        const username = token ? token.replace('token_', '') : '';
        const adminUser = await usersCollection.findOne({ username: username, role: 'superadmin' });

        if (!adminUser) {
            return res.status(403).json({ success: false, message: 'Нет доступа' });
        }

        await boardCollection.updateOne(
            { _id: 'main' },
            { $set: { html: req.body.boardData } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка сохранения' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
