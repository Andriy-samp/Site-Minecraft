const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(__dirname));

// Функция для безопасного чтения базы (если файл пустой — пересоздаем)
function getDB() {
    try {
        if (!fs.existsSync(DB_FILE)) throw new Error('File not found');
        const content = fs.readFileSync(DB_FILE, 'utf8');
        if (!content || content.trim() === '') throw new Error('Empty file');
        return JSON.parse(content);
    } catch (e) {
        console.log('База данных была пустой или поврежденной. Создаем новую...');
        const initialData = {
            users: [
                // ЗДЕСЬ ТЫ МОЖЕШЬ ПОМЕНЯТЬ ПАРОЛИ
                { username: 'K1nzy', password: '123456', role: 'superadmin' },
                { username: 'ZombieMainer', password: '123456', role: 'superadmin' }
            ],
            boardData: null
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

// Функция для безопасного сохранения
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Инициализация базы при старте
getDB();

// 1. Авторизация
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDB();

    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (user) {
        res.json({ success: true, token: 'token_' + user.username, role: user.role, username: user.username });
    } else {
        res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
});

// 2. Получить доску
app.get('/api/board', (req, res) => {
    const db = getDB();
    res.json({ boardData: db.boardData });
});

// 3. Сохранить доску (только для админов)
app.post('/api/board', (req, res) => {
    const token = req.headers.authorization;
    const db = getDB();

    const user = db.users.find(u => 'token_' + u.username === token);

    if (!user || user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Нет доступа' });
    }

    db.boardData = req.body.boardData;
    saveDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
