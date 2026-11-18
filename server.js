const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Берём строку подключения из переменной окружения Render
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('ОШИБКА: Не задана переменная MONGODB_URI');
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db, usersCollection, boardCollection;

// Функция подключения к базе и создания начальных данных
async function connectDB() {
    await client.connect();
    db = client.db('spacetime'); // Имя базы данных
    usersCollection = db.collection('users');
    boardCollection = db.collection('board');

    // Если пользователей нет — создаём админов
    const userCount = await usersCollection.countDocuments();
    if (userCount === 0) {
        await usersCollection.insertMany([
            { username: 'K1nzy', password: '123456', role: 'superadmin' },
            { username: 'ZombieMainer', password: '123456', role: 'superadmin' }
        ]);
        console.log('Созданы начальные админы.');
    }

    console.log('Подключение к MongoDB Atlas успешно!');
}

connectDB().catch(console.error);

app.use(express.json());
app.use(express.static(__dirname));

// 1. Авторизация
app.post('/api/login', async (req, res) => {
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
});

// 2. Получить доску
app.get('/api/board', async (req, res) => {
    const boardDoc = await boardCollection.findOne({ _id: 'main' });
    res.json({ boardData: boardDoc ? boardDoc.html : null });
});

// 3. Сохранить доску (только для админов)
app.post('/api/board', async (req, res) => {
    const token = req.headers.authorization;

    // Проверяем, есть ли такой токен и является ли он админом
    const user = await usersCollection.findOne({ 'token': token }); // (упрощённая проверка)
    // В реальном проекте лучше хранить токены отдельно, но для беты сойдёт

    const username = token.replace('token_', '');
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
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
