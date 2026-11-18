(function () {
    'use strict';

    const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;

    // ===== DOM =====
    const canvas = document.getElementById('clockCanvas');
    const ctx = canvas.getContext('2d');
    const bgPoly = document.getElementById('bgPoly');
    const cracksMain = document.getElementById('cracksMain');
    const cracksBranch = document.getElementById('cracksBranches');
    const header = document.getElementById('header');
    const mainView = document.getElementById('main-view');

    const homeBtn = document.getElementById('homeBtn');
    const teamBtn = document.getElementById('teamBtn');
    const boardBtn = document.getElementById('boardBtn');
    const langBtn = document.getElementById('langBtn');
    const langOptEls = document.querySelectorAll('.lang-opt');
    const epochBtnEls = document.querySelectorAll('.epoch-btn');

    const epochModal = document.getElementById('epochModal');
    const epochModalText = document.getElementById('epochModalText');
    const epochNameEl = document.getElementById('epochName');
    const modalBackBtn = document.getElementById('modalBackBtn');
    const modalAboutEpochBtn = document.getElementById('modalAboutEpochBtn');
    const modalCreateBtn = document.getElementById('modalCreateBtn');

    const infoPanel = document.getElementById('infoPanel');
    const infoTitle = document.getElementById('infoTitle');
    const infoText = document.getElementById('infoText');
    const infoCloseBtn = document.getElementById('infoCloseBtn');

    const teamTab = document.getElementById('team-tab');
    const boardTab = document.getElementById('board-tab');
    const aboutSection = document.getElementById('about-section');
    const aboutContent = document.getElementById('aboutContent');
    const aboutTitle = document.getElementById('aboutTitle');
    const aboutCracks = document.getElementById('aboutCracks');

    const teamContainer = document.getElementById('teamContainer');
    const teamTitle = document.getElementById('teamTitle');
    const teamBackBtn = document.getElementById('teamBackBtn');

    const boardTitle = document.getElementById('boardTitle');
    const boardContainer = document.getElementById('boardContainer');
    const boardBackBtn = document.getElementById('boardBackBtn');

    // Админ
    const adminModal = document.getElementById('adminModal');
    const adminUser = document.getElementById('adminUser');
    const adminPass = document.getElementById('adminPass');
    const adminSubmitBtn = document.getElementById('adminSubmitBtn');
    const adminCancelBtn = document.getElementById('adminCancelBtn');
    const adminLoginTrigger = document.getElementById('adminLoginTrigger');
    const adminBadge = document.getElementById('adminBadge');
    const saveBoardBtn = document.getElementById('saveBoardBtn');

    const W = canvas.width;
    const H = canvas.height;
    const RADIUS = W / 2 - 20;

    // ===== Состояние =====
    let state = 'idle';
    let isAccelerated = false;
    let clockTime = new Date();
    let lastTimestamp = 0;
    let selectedEpoch = null;
    let headerTimer = null;
    let currentThemeKey = 'future';
    let chosenThemeKey = null;
    let currentLang = 'ru';
    let currentCycleTheme = 'future';
    let isHovering = false;
    let aboutTypingStarted = false;
    let epochTypingAbort = false;
    let typingAbort = false;
    let aboutObserver = null;
    let cachedStarsGroup = null;

    // БЕЗОПАСНОСТЬ: Используем sessionStorage (доступ сбрасывается при закрытии вкладки)
    let adminToken = sessionStorage.getItem('adminToken') || null;
    let currentUser = sessionStorage.getItem('username') || null;
    let currentBoardData = null;

    // Проверка админа
    const isAdmin = !!adminToken;
    if (isAdmin) {
        adminBadge.style.display = 'block';
        adminBadge.textContent = `admin: ${currentUser}`;
        saveBoardBtn.style.display = 'block';
        boardContainer.setAttribute('contenteditable', 'true');
        boardTab.classList.add('admin-editing');
    }

    // =====================================================================
    // СЕРВЕР (АДМИНКА)
    // =====================================================================
    adminLoginTrigger.addEventListener('click', () => {
        adminModal.classList.add('show');
        adminUser.focus();
    });

    adminCancelBtn.addEventListener('click', () => {
        adminModal.classList.remove('show');
        adminUser.value = '';
        adminPass.value = '';
    });

    adminSubmitBtn.addEventListener('click', async () => {
        const user = adminUser.value;
        const pass = adminPass.value;
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (data.success) {
                sessionStorage.setItem('adminToken', data.token);
                sessionStorage.setItem('username', data.username);
                location.reload();
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert('Ошибка подключения к серверу (Запущен ли node server.js?)');
        }
    });

    saveBoardBtn.addEventListener('click', async () => {
        if (!adminToken) return;
        const html = boardContainer.innerHTML;
        try {
            const res = await fetch('/api/board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                body: JSON.stringify({ boardData: html })
            });
            if (res.ok) {
                alert('Доска сохранена на сервере!');
                currentBoardData = html;
            } else {
                alert('Ошибка сохранения');
            }
        } catch (e) {
            alert('Ошибка подключения к серверу');
        }
    });

    async function loadBoardData() {
        try {
            const res = await fetch('/api/board');
            const data = await res.json();
            currentBoardData = data.boardData;
            if (currentBoardData) boardContainer.innerHTML = currentBoardData;
        } catch (e) {
            console.log('Не удалось загрузить доску с сервера');
        }
    }
    loadBoardData();

    // =====================================================================
    // СЛОВАРИ (ЛОКАЛИЗАЦИЯ)
    // =====================================================================
    const TEXTS = {
        ru: {
            boardBtn: 'Доска объявлений', homeBtn: 'Главная', teamBtn: 'Команда',
            epochs: { steam: 'Паровой век', medieval: 'Средневековье', modern: 'Наше время', future: 'Далекое будущее' },
            modalText: 'Выбрана эпоха: ', modalCreated: 'Персонаж создан. Эпоха: ',
            btnBack: 'Назад', btnAbout: 'Об эпохе', btnCreate: 'Создать персонажа', btnUnavailable: 'Недоступно в бете', btnClose: 'Закрыть',
            aboutTitle: 'О сервере', teamTitle: 'Команда', boardTitle: '📜 Доска объявлений 📜',
            teamData: [
                { role: 'Владелец', members: [{ name: 'ZombieMainer (Zombik)', role: 'Владелец сервера · 3D-дизайнер', skin: 'skins/zombik.jpg', desc: 'Ну что же, я ZombieMainer (Zombik), владелец сервера SpaceTime и по совместительству 3D-дизайнер. Главная цель нашей команды — собрать людей, готовых идти до конца, даже если будет чутка проблем и сложностей.' }] },
                { role: 'Сервер', members: [{ name: 'Arix', role: 'Программист', skin: null, desc: 'Всем доброго времени суток. Я Arix, программист этого сервера. Моя цель — создавать новые механики и воплощать старые. Со временем придётся собирать команду тех, кто сможет выполнять задачи программиста. Я готов обучить человека, если у него мало опыта, и самому узнать что-то новое у более опытных людей.' }] },
                { role: 'Сайт', members: [{ name: 'K1nzy', role: 'Веб-дизайнер', skin: 'skins/k1nzy.jpg', desc: 'Ну что же, приветствую. Я K1nzy, веб-дизайнер данного сервера. Моя главная задача — сделать классный сайт, который будет идеально работать и смотреться к тематике сервера. Я и мой помощник очень старались для вас, чтобы вам было комфортно и приятно смотреть на такой сайт. Надеюсь, вам понравится наша работа.' }, { name: 'MishaLivinov', role: 'Помощник веб-дизайнера · Монтажёр', skin: null, desc: 'Ну что же, я MishaLivinov, помощник веб-дизайнера и монтажёр сервера SpaceTime. Моя главная задача в команде — делать качественный контент и помогать проекту развиваться, несмотря на любые трудности. Несмотря на всё, я вместе с нашим веб-дизайнером делаю так, чтобы ваши глазки радовались сайту сервера. Надеюсь, вам понравится работа веб-дизайнера и остальных членов нашей команды, и вы когда-нибудь присоединитесь к ней, чтобы вместе мы сделали наш проект великим.' }] },
                { role: '3D Дизайн', members: [{ name: 'zery_oper', role: '3D-дизайнер сервера', skin: null, desc: 'Ку, я zery_oper, 3д дизайнер сервера. Я стараюсь сделать этот сервер красивее и качественнее. Даже если занят и дел по горло, готов сделать что-то новое и уникальное. Наша командная работа поможет нам сделать лучшее, что видели мы и игроки сервера.' }] }
            ],
            boardNotices: [{ title: 'Разыскивается', text: 'Дракон. Награда: 100 золотых.' }, { title: 'Кузнец', text: 'Починка мечей и доспехов. Недорого.' }, { title: 'Собрание', text: 'Завтра на площади. Явка строго обязательна.' }, { title: 'Осторожно', text: 'В лесу видели волков. Не выходите ночью.' }],
            aboutHTML: `<p>Добро пожаловать на сервер, где век — это не точка отсчёта событий, а ваш личный выбор, где развиваться, жить и работать. Этот сервер — не просто «Майнкрафт», а отдельный мир, где именно ты решаешь, как жить.</p><p>Мы создали мир, в котором каждый игрок может выбрать свою эпоху и прожить её по-настоящему. Сервер работает на тщательно подобранных модах, которые обеспечивают глубокую проработку механик, атмосферу и стабильную экономическую систему.</p><p>Хочешь <span class="epoch-tag">Средневековье</span>? Пожалуйста. Вечная чума, мечи, мушкеты, кораблестроение, нулевая гигиена и дикие звери прямо в городах. Пришёл в любое поселение — встретишь инквизицию.</p><p>Предпочитаешь <span class="epoch-tag">Паровой век</span>? Эпоха безумных изобретений, угля и огромных механизмов. Почти всё, чем ты пользуешься, состоит из шестерёнок и поршней.</p><p>А если душа просит <span class="epoch-tag">Киберпанка</span> — добро пожаловать в будущее, где ты одновременно конструктор и раб. Роботизация забирает работу, и ты оказываешься в огромном кибернетическом аду.</p><p>И, конечно, <span class="epoch-tag">Наше время</span>. XXI век — эпоха стремительных перемен и невероятных возможностей. Наука не стоит на месте, многое изучается, прогресс идёт вперёд.</p><p>Всё это крутится на мощных модах, которые делают мир живым и глубоким. Экономика здесь не для галочки — она настоящая. Торгуй между эпохами, строй производства, нанимай людей.</p><p>Сервер не про «просто пофармить». Здесь про атмосферу, про выбор, про то, как ты будешь жить в выбранной эпохе.</p><div class="contacts"><strong>Связь с поддержкой:</strong><br>Номер телефона РФ: <a href="tel:+79533291429">+7 953 329-14-29</a><br>Telegram: <a href="https://t.me/bibrych" target="_blank" rel="noopener">@bibrych</a><br>Почта: <a href="mailto:spacetime993@gmail.com">spacetime993@gmail.com</a><br>Telegram-канал: <a href="https://t.me/SpaceTimeEco" target="_blank" rel="noopener">t.me/SpaceTimeEco</a><br>Discord: <a href="https://discord.gg/EQ4MXSqxA" target="_blank" rel="noopener">discord.gg/EQ4MXSqxA</a></div>`
        },
        ua: {
            boardBtn: 'Дошка оголошень', homeBtn: 'Головна', teamBtn: 'Команда',
            epochs: { steam: 'Парова доба', medieval: 'Середньовіччя', modern: 'Наш час', future: 'Далеке майбутнє' },
            modalText: 'Обрано епоху: ', modalCreated: 'Персонажа створено. Епоха: ',
            btnBack: 'Назад', btnAbout: 'Про епоху', btnCreate: 'Створити персонажа', btnUnavailable: 'Недоступно в бета', btnClose: 'Закрити',
            aboutTitle: 'Про сервер', teamTitle: 'Команда', boardTitle: '📜 Дошка оголошень 📜',
            teamData: [
                { role: 'Власник', members: [{ name: 'ZombieMainer (Zombik)', role: 'Власник сервера · 3D-дизайнер', skin: 'skins/zombik.jpg', desc: 'Ну що ж, я ZombieMainer (Zombik), власник сервера SpaceTime і за сумісництвом 3D-дизайнер. Головна мета нашої команди — зібрати людей, готових йти до кінця, навіть якщо буде трохи проблем і складнощів.' }] },
                { role: 'Сервер', members: [{ name: 'Arix', role: 'Програміст', skin: null, desc: 'Усім доброго часу доби. Я Arix, програміст цього сервера. Моя мета — створювати нові механіки та втілювати старі. Згодом доведеться збирати команду тих, хто зможе виконувати завдання програміста. Я готовий навчити людину, якщо в неї мало досвіду, і самому дізнатися щось нове у більш досвідчених людей.' }] },
                { role: 'Сайт', members: [{ name: 'K1nzy', role: 'Веб-дизайнер', skin: 'skins/k1nzy.jpg', desc: 'Ну що ж, вітаю. Я K1nzy, веб-дизайнер даного сервера. Моє головне завдання — зробити класний сайт, який буде ідеально працювати і виглядати відповідно до тематики сервера. Я і мій помічник дуже намагалися для вас, щоб вам було комфортно і приємно дивитися на такий сайт. Сподіваюся, вам сподобається наша робота.' }, { name: 'MishaLivinov', role: 'Помічник веб-дизайнера · Монтажер', skin: null, desc: 'Ну що ж, я MishaLivinov, помічник веб-дизайнера і монтажер сервера SpaceTime. Моє головне завдання в команді — робити якісний контент і допомагати проєкту розвиватися, незважаючи на будь-які труднощі. Незважаючи на все, я разом з нашим веб-дизайнером роблю так, щоб ваші очі раділи сайту сервера. Сподіваюся, вам сподобається робота веб-дизайнера та інших членів нашої команди, і ви колись приєднаєтеся до неї, щоб разом ми зробили наш проєкт великим.' }] },
                { role: '3D Дизайн', members: [{ name: 'zery_oper', role: '3D-дизайнер сервера', skin: null, desc: 'Ку, я zery_oper, 3д дизайнер сервера. Я намагаюся зробити цей сервер красивішим і якіснішим. Навіть якщо зайнятий і справ по горло, готовий зробити щось нове та унікальне. Наша командна робота допоможе нам зробити найкраще, що бачили ми та гравці сервера.' }] }
            ],
            boardNotices: [{ title: 'Розшукується', text: 'Дракон. Нагорода: 100 золотих.' }, { title: 'Коваль', text: 'Ремонт мечів та обладунків. Недорого.' }, { title: 'Збори', text: 'Завтра на площі. Явка суворо обов\'язкова.' }, { title: 'Обережно', text: 'У лісі бачили вовків. Не виходьте вночі.' }],
            aboutHTML: `<p>Ласкаво просимо на сервер, де століття — це не точка відліку подій, а ваш особистий вибір, де розвиватися, жити та працювати. Цей сервер — не просто «Майнкрафт», а окремий світ, де саме ти вирішуєш, як жити.</p><p>Ми створили світ, у якому кожен гравець може обрати свою епоху і прожити її по-справжньому. Сервер працює на ретельно підібраних модах, які забезпечують глибоку проробку механік, атмосферу та стабільну економічну систему.</p><p>Хочеш <span class="epoch-tag">Середньовіччя</span>? Будь ласка. Вічна чума, мечі, мушкети, кораблебудування, нульова гігієна та дикі звірі прямо в містах. Прийшов у будь-яке поселення — зустрінеш інквізицію.</p><p>Надаєш перевагу <span class="epoch-tag">Паровій добі</span>? Епоха божевільних винаходів, вугілля та величезних механізмів. Майже все, чим ти користуєшся, складається з шестерень та поршнів.</p><p>А якщо душа просить <span class="epoch-tag">Кіберпанку</span> — ласкаво просимо в майбутнє, де ти одночасно конструктор і раб. Роботизація забирає роботу, і ти опиняєшся у величезному кібернетичному пеклі.</p><p>І, звісно, <span class="epoch-tag">Наш час</span>. XXI століття — епоха стрімких змін та неймовірних можливостей. Наука не стоїть на місці, багато чого вивчається, прогрес іде вперед.</p><p>Все це крутиться на потужних модах, які роблять світ живим та глибоким. Економіка тут не для галочки — вона справжня. Торгуй між епохами, будуй виробництва, наймай людей.</p><p>Сервер не про «просто пофармити». Тут про атмосферу, про вибір, про те, як ти будеш жити в обраній епосі.</p><div class="contacts"><strong>Зв'язок з підтримкою:</strong><br>Номер телефону РФ: <a href="tel:+79533291429">+7 953 329-14-29</a><br>Telegram: <a href="https://t.me/bibrych" target="_blank" rel="noopener">@bibrych</a><br>Пошта: <a href="mailto:spacetime993@gmail.com">spacetime993@gmail.com</a><br>Telegram-канал: <a href="https://t.me/SpaceTimeEco" target="_blank" rel="noopener">t.me/SpaceTimeEco</a><br>Discord: <a href="https://discord.gg/EQ4MXSqxA" target="_blank" rel="noopener">discord.gg/EQ4MXSqxA</a></div>`
        },
        en: {
            boardBtn: 'Notice Board', homeBtn: 'Home', teamBtn: 'Team',
            epochs: { steam: 'Steampunk', medieval: 'Medieval', modern: 'Modern Era', future: 'Cyberpunk' },
            modalText: 'Selected epoch: ', modalCreated: 'Character created. Epoch: ',
            btnBack: 'Back', btnAbout: 'About Epoch', btnCreate: 'Create Character', btnUnavailable: 'Unavailable in beta', btnClose: 'Close',
            aboutTitle: 'About Server', teamTitle: 'Team', boardTitle: '📜 Notice Board 📜',
            teamData: [
                { role: 'Owner', members: [{ name: 'ZombieMainer (Zombik)', role: 'Server Owner · 3D Artist', skin: 'skins/zombik.jpg', desc: 'Well, I am ZombieMainer (Zombik), the owner of the SpaceTime server and also a 3D artist. The main goal of our team is to gather people who are ready to go all the way, even if there are some problems and difficulties.' }] },
                { role: 'Server', members: [{ name: 'Arix', role: 'Programmer', skin: null, desc: 'Good day to everyone. I am Arix, the programmer of this server. My goal is to create new mechanics and implement old ones. Over time, I will have to gather a team of those who can perform programmer tasks. I am ready to train a person if they have little experience and learn something new from more experienced people myself.' }] },
                { role: 'Website', members: [{ name: 'K1nzy', role: 'Web Designer', skin: 'skins/k1nzy.jpg', desc: 'Well, greetings. I am K1nzy, the web designer of this server. My main task is to make a cool website that will work perfectly and match the server theme. My assistant and I tried very hard for you so that you would be comfortable and pleased to look at such a site. I hope you like our work.' }, { name: 'MishaLivinov', role: 'Web Designer Assistant · Editor', skin: null, desc: 'Well, I am MishaLivinov, the web designer assistant and editor of the SpaceTime server. My main task in the team is to create quality content and help the project develop despite any difficulties. Despite everything, my web designer and I are doing everything to make your eyes happy with the server website. I hope you like the work of the web designer and other members of our team, and you will join it someday so that together we can make our project great.' }] },
                { role: '3D Design', members: [{ name: 'zery_oper', role: 'Server 3D Artist', skin: null, desc: 'Yo, I am zery_oper, the 3D artist of the server. I try to make this server more beautiful and high-quality. Even if I am busy and have my hands full, I am ready to make something new and unique. Our teamwork will help us make the best that we and the server players have ever seen.' }] }
            ],
            boardNotices: [{ title: 'Wanted', text: 'Dragon. Reward: 100 gold.' }, { title: 'Blacksmith', text: 'Repair of swords and armor. Inexpensive.' }, { title: 'Meeting', text: 'Tomorrow at the square. Attendance is strictly mandatory.' }, { title: 'Caution', text: 'Wolves have been seen in the forest. Do not go out at night.' }],
            aboutHTML: `<p>Welcome to the server where the century is not a starting point of events, but your personal choice of where to develop, live, and work. This server is not just "Minecraft", but a separate world where you decide how to live.</p><p>We have created a world in which every player can choose their own epoch and live it for real. The server runs on carefully selected mods that provide deep mechanics, atmosphere, and a stable economic system.</p><p>Want <span class="epoch-tag">Medieval</span>? Please. Eternal plague, swords, muskets, shipbuilding, zero hygiene, and wild beasts right in the cities. Come to any settlement and you will meet the Inquisition.</p><p>Prefer <span class="epoch-tag">Steampunk</span>? An era of crazy inventions, coal, and huge mechanisms. Almost everything you use consists of gears and pistons.</p><p>And if your soul asks for <span class="epoch-tag">Cyberpunk</span>, welcome to the future where you are both a constructor and a slave. Robotization takes away your job, and you find yourself in a huge cybernetic hell.</p><p>And, of course, the <span class="epoch-tag">Modern Era</span>. The XXI century is an era of rapid change and incredible opportunities. Science does not stand still, much is being studied, and progress is moving forward.</p><p>All this revolves around powerful mods that make the world alive and deep. The economy here is not just for show, it's real. Trade between epochs, build production, hire people.</p><p>The server is not about "just grinding". It's about the atmosphere, about the choice, about how you will live in the chosen epoch.</p><div class="contacts"><strong>Support contacts:</strong><br>Phone (RU): <a href="tel:+79533291429">+7 953 329-14-29</a><br>Telegram: <a href="https://t.me/bibrych" target="_blank" rel="noopener">@bibrych</a><br>Email: <a href="mailto:spacetime993@gmail.com">spacetime993@gmail.com</a><br>Telegram Channel: <a href="https://t.me/SpaceTimeEco" target="_blank" rel="noopener">t.me/SpaceTimeEco</a><br>Discord: <a href="https://discord.gg/EQ4MXSqxA" target="_blank" rel="noopener">discord.gg/EQ4MXSqxA</a></div>`
        }
    };

    const EPOCH_THEMES = {
        steam: { bgColor: '#061216', glowColor: 'rgba(0, 229, 255, 0.6)', scanlineColor: 'transparent', neonMain: ['#00e5ff', '#ff8c00', '#d48806', '#ffffff'], neonBranch: ['#00e5ff', '#ff8c00', '#d48806'], accent: '#00e5ff', accent2: '#ff8c00', accentSoft: 'rgba(0, 229, 255, 0.5)', accentFaint: 'rgba(0, 229, 255, 0.25)', btnBg: 'rgba(6, 18, 22, 0.9)', btnHoverBg: 'rgba(255, 140, 0, 0.15)', canvasGlow: 'rgba(0, 229, 255, 0.35)', headerBg: 'rgba(6, 18, 22, 0.92)' },
        medieval: { bgColor: '#0f0b08', glowColor: 'rgba(160, 107, 58, 0.6)', scanlineColor: 'transparent', neonMain: ['#a06b3a', '#d4a373', '#8b0000', '#ffcc00'], neonBranch: ['#a06b3a', '#8b0000', '#d4a373'], accent: '#a06b3a', accent2: '#d4a373', accentSoft: 'rgba(160, 107, 58, 0.5)', accentFaint: 'rgba(160, 107, 58, 0.25)', btnBg: 'rgba(15, 11, 8, 0.9)', btnHoverBg: 'rgba(160, 107, 58, 0.15)', canvasGlow: 'rgba(160, 107, 58, 0.35)', headerBg: 'rgba(15, 11, 8, 0.92)' },
        modern: { bgColor: '#000000', glowColor: 'rgba(0, 255, 0, 0.5)', scanlineColor: 'transparent', neonMain: ['#00ff00', '#ffffff', '#00ffcc', '#33ff33'], neonBranch: ['#00ff00', '#00ffcc', '#ffffff'], accent: '#00ff00', accent2: '#ffffff', accentSoft: 'rgba(0, 255, 0, 0.5)', accentFaint: 'rgba(0, 255, 0, 0.25)', btnBg: 'rgba(0, 0, 0, 0.9)', btnHoverBg: 'rgba(0, 255, 0, 0.15)', canvasGlow: 'rgba(0, 255, 0, 0.35)', headerBg: 'rgba(0, 0, 0, 0.92)' },
        future: { bgColor: '#02000a', glowColor: 'rgba(255, 0, 255, 0.5)', scanlineColor: 'rgba(180, 0, 255, 0.02)', neonMain: ['#ff00ff', '#00ffff', '#ffffff', '#b300ff'], neonBranch: ['#ff00ff', '#00ffff', '#ffffff'], accent: '#ff00ff', accent2: '#00ffff', accentSoft: 'rgba(255, 0, 255, 0.5)', accentFaint: 'rgba(255, 0, 255, 0.25)', btnBg: 'rgba(10, 0, 26, 0.88)', btnHoverBg: 'rgba(255, 0, 255, 0.15)', canvasGlow: 'rgba(255, 0, 255, 0.35)', headerBg: 'rgba(5, 0, 16, 0.92)' }
    };

    const EPOCH_CLOCKS = {
        steam: { bg1: '#2a3338', bg2: '#121b1f', bg3: '#061216', border: '#ff8c00', text: '#00e5ff', tick: '#5a7a85', hour: '#ff8c00', min: '#00e5ff', sec: '#ffffff', center: '#d48806' },
        medieval: { bg1: '#fdf5e6', bg2: '#d7ccc8', bg3: '#8d6e63', border: '#3e2723', text: '#3e2723', tick: '#4e342e', hour: '#1b110e', min: '#3e2723', sec: '#b71c1c', center: '#5d4037' },
        modern: { bg1: '#001100', bg2: '#002200', bg3: '#000000', border: '#00ff00', text: '#00ff00', tick: '#005500', hour: '#00ffcc', min: '#00ff00', sec: '#ffffff', center: '#00ff00' },
        future: { bg1: '#1a003a', bg2: '#0a001a', bg3: '#050010', border: '#ff00ff', text: '#00ffff', tick: '#330066', hour: '#00ffff', min: '#ff00ff', sec: '#ffffff', center: '#ff00ff' }
    };

    const EPOCH_INFO = {
        steam: {
            ru: { title: 'Паровой век (Стимпанк)', text: 'Эпоха безумных изобретений, угля и огромных механизмов, где почти всё, что ты используешь, состоит из шестерёнок и поршней. Стань первооткрывателем и инженером будущего! Создавай устройства для развития города или модифицируй себя самого. Вырвись из низов — из класса простых рабочих, чтобы впоследствии самому управлять ими. Стань капитаном дирижабля или отважным путешественником, открывай новые неизведанные земли или развивайся в огромных мегаполисах, где начинается первая автоматизация.' },
            ua: { title: 'Парова доба (Стимпанк)', text: 'Епоха божевільних винаходів, вугілля та величезних механізмів, де майже все, що ти використовуєш, складається з шестерень і поршнів. Стань першовідкривачем та інженером майбутнього! Створюй пристрої для розвитку міста або модифікуй самого себе. Вирвись із низів — із класу простих робітників, щоб згодом самому керувати ними. Стань капітаном дирижабля або відважним мандрівником, відкривай нові незвідані землі або розвивайся у величезних мегаполісах, де починається перша автоматизація.' },
            en: { title: 'Steampunk', text: 'An era of crazy inventions, coal, and huge mechanisms, where almost everything you use consists of gears and pistons. Become a pioneer and engineer of the future! Create devices for the development of the city or modify yourself. Break out from the bottom — from the class of simple workers — to eventually manage them yourself. Become an airship captain or a brave traveler, discover new uncharted lands or develop in huge megacities where the first automation begins.' }
        },
        medieval: {
            ru: { title: 'Средневековье', text: 'Тебе предстоит выбрать: жить во времена вечной чумы и мечей или в эпоху мушкетов и кораблестроения. Это время нулевой гигиены и борьбы за выживание против диких зверей даже внутри городов. Придя в любое поселение, ты столкнёшься с инквизицией. Церкви здесь стали чуть ли не вторыми правителями княжеств, а служить им или идти против них — уже твой выбор. И всё это на фоне постоянных войн королевств друг с другом и бесконечных крестовых походов.' },
            ua: { title: 'Середньовіччя', text: 'Тобі належить вибрати: жити за часів вічної чуми та мечів або в епоху мушкетів і кораблебудування. Це час нульової гігієни та боротьби за виживання проти диких звірів навіть усередині міст. Прийшовши в будь-яке поселення, ти зіткнешся з інквізицією. Церкви тут стали чи не другими правителями князівств, а служити їм чи йти проти них — вже твій вибір. І все це на тлі постійних воєн королівств одне з одним і нескінченних хрестових походів.' },
            en: { title: 'Medieval', text: 'You have to choose: live during the eternal plague and swords or in the era of muskets and shipbuilding. This is a time of zero hygiene and the struggle for survival against wild beasts even inside cities. Arriving at any settlement, you will face the Inquisition. Churches here have become almost the second rulers of principalities, and serving them or going against them is already your choice. And all this against the backdrop of constant wars of kingdoms with each other and endless crusades.' }
        },
        modern: {
            ru: { title: 'Наше время', text: 'XXI век — эпоха стремительных перемен и невероятных возможностей. То, что пару десятилетий назад казалось фантастикой, сегодня стало обыденностью. Наука не стоит на месте, многое изучается, прогресс идёт вперёд. Но у него есть и обратная сторона: огромный поток информации иногда приводит к росту риска столкнуться с фейками и манипуляциями. При этом наш век — ещё и время возможностей для отдельного человека. И каждый может решить, каким будет будущее.' },
            ua: { title: 'Наш час', text: 'XXI століття — епоха стрімких змін і неймовірних можливостей. Те, що пару десятиліть тому здавалося фантастикою, сьогодні стало буденністю. Наука не стоїть на місці, багато чого вивчається, прогрес іде вперед. Але в нього є й зворотний бік: величезний потік інформації іноді призводить до зростання ризику зіткнутися з фейками та маніпуляціями. При цьому наше століття — ще й час можливостей для окремої людини. І кожен може вирішити, яким буде майбутнє.' },
            en: { title: 'Modern Era', text: 'The 21st century is an era of rapid change and incredible opportunities. What seemed like science fiction a couple of decades ago has become commonplace today. Science does not stand still, much is being studied, progress is moving forward. But it also has a downside: a huge flow of information sometimes leads to an increased risk of encountering fakes and manipulations. At the same time, our century is also a time of opportunities for an individual. And everyone can decide what the future will be like.' }
        },
        future: {
            ru: { title: 'Киберпанк', text: 'Время, в котором ты — конструктор и раб будущего. Роботизация забирает твою работу, и ты оказываешься в огромном кибернетическом аду, где потеря заработка равна смерти. У тебя есть два пути: попытаться подняться с самого низа в этом мегаполисе или же выбраться прочь из города и обосноваться в остатках мёртвых земель, постепенно добираясь до других временных веток и торгуя с ними.' },
            ua: { title: 'Кіберпанк', text: 'Час, у якому ти — конструктор і раб майбутнього. Роботизація забирає твою роботу, і ти опиняєшся у величезному кібернетичному пеклі, де втрата заробітку дорівнює смерті. У тебе є два шляхи: спробувати піднятися з самого низу в цьому мегаполісі або ж вибратися геть з міста та оселитися в залишках мертвих земель, поступово добираючись до інших часових гілок і торгуючи з ними.' },
            en: { title: 'Cyberpunk', text: 'A time where you are a constructor and a slave of the future. Robotization takes away your job, and you find yourself in a huge cybernetic hell, where loss of earnings equals death. You have two paths: try to rise from the very bottom in this megacity or get out of the city and settle in the remnants of dead lands, gradually getting to other time branches and trading with them.' }
        }
    };

    const isTouch = window.matchMedia('(hover: none)').matches;

    // =====================================================================
    // ЛОКАЛИЗАЦИЯ
    // =====================================================================
    function updateLanguage(lang) {
        currentLang = lang;
        const t = TEXTS[lang];

        langBtn.textContent = lang.toUpperCase();
        boardBtn.textContent = t.boardBtn;
        homeBtn.textContent = t.homeBtn;
        teamBtn.textContent = t.teamBtn;

        epochBtnEls.forEach(btn => { btn.textContent = t.epochs[btn.dataset.epoch]; });

        modalBackBtn.textContent = t.btnBack;
        modalAboutEpochBtn.textContent = t.btnAbout;

        if (state === 'modal' && selectedEpoch) {
            if (selectedEpoch === 'medieval' || isAdmin) {
                modalCreateBtn.textContent = t.btnCreate;
            } else {
                modalCreateBtn.textContent = t.btnUnavailable;
            }
        } else {
            modalCreateBtn.textContent = t.btnCreate;
        }

        infoCloseBtn.textContent = t.btnClose;
        teamBackBtn.textContent = t.btnBack;
        boardBackBtn.textContent = t.btnBack;

        aboutTitle.textContent = t.aboutTitle;
        teamTitle.textContent = t.teamTitle;
        boardTitle.textContent = t.boardTitle;

        teamContainer.innerHTML = t.teamData.map(section => `
            <section class="team-section">
                <h3>${section.role}</h3>
                ${section.members.map(m => `
                    <div class="team-member">
                        <div class="member-skin ${m.skin ? '' : 'empty'}">
                            ${m.skin ? `<img src="${m.skin}" alt="${m.name}" style="object-fit: cover;">` : 'empty'}
                        </div>
                        <div class="member-info">
                            <div class="member-name">${m.name}</div>
                            <div class="member-role">${m.role}</div>
                            <p>${m.desc}</p>
                        </div>
                    </div>
                `).join('')}
            </section>
        `).join('');

        if (currentBoardData) {
            boardContainer.innerHTML = currentBoardData;
        } else {
            boardContainer.innerHTML = t.boardNotices.map((notice, i) => `
                <div class="notice-paper" style="--rot: ${(i % 2 === 0 ? -1 : 1) * (2 + i)}deg;">
                    <strong>${notice.title}</strong><br>${notice.text}
                </div>
            `).join('');
        }

        aboutContent.innerHTML = t.aboutHTML;
        aboutTypingStarted = false;
        typingAbort = true;
        epochTypingAbort = true;
        if (aboutCracks) aboutCracks.innerHTML = '';

        const aboutRect = aboutSection.getBoundingClientRect();
        if (aboutRect.top < window.innerHeight && aboutRect.bottom > 0) {
            startAboutTyping();
        } else {
            initAboutObserver();
        }
    }

    langOptEls.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentLang !== opt.dataset.lang) updateLanguage(opt.dataset.lang);
        });
    });

    // =====================================================================
    // ПЕЧАТЬ ТЕКСТА
    // =====================================================================
    updateLanguage('ru');

    function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

    function wrapCharsInNode(root, out) {
        const textNodes = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            if (!text) return;
            const frag = document.createDocumentFragment();
            for (let i = 0; i < text.length; i++) {
                const span = document.createElement('span');
                span.className = 'typed-char';
                span.textContent = text[i];
                frag.appendChild(span);
                out.push(span);
            }
            textNode.parentNode.replaceChild(frag, textNode);
        });
    }

    function revealCharsAsync(chars, msPerChar) {
        return new Promise(resolve => {
            let i = 0;
            let lastTime = performance.now();
            function step(time) {
                if (typingAbort || i >= chars.length) { resolve(); return; }
                if (time - lastTime >= msPerChar) {
                    const count = Math.max(1, Math.floor((time - lastTime) / msPerChar));
                    for (let c = 0; c < count; c++) {
                        if (i < chars.length) { chars[i].classList.add('visible'); i++; }
                    }
                    lastTime = time;
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    }

    function initAboutObserver() {
        if (!aboutContent || !aboutSection) return;
        if (aboutObserver) aboutObserver.disconnect();
        aboutObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startAboutTyping();
                    aboutObserver.disconnect();
                }
            });
        }, { threshold: 0.05 });
        aboutObserver.observe(aboutSection);
    }

    async function startAboutTyping() {
        if (aboutTypingStarted) return;
        aboutTypingStarted = true;
        typingAbort = true;
        await waitMs(50);
        typingAbort = false;
        generateAboutCracks();
        const paras = Array.from(aboutContent.querySelectorAll('p'));
        const contacts = aboutContent.querySelector('.contacts');
        paras.forEach(p => p.style.display = 'none');
        if (contacts) contacts.style.display = 'none';
        for (const p of paras) {
            if (typingAbort) return;
            p.style.display = '';
            const chars = [];
            wrapCharsInNode(p, chars);
            await revealCharsAsync(chars, 12);
            if (typingAbort) return;
            await waitMs(220);
        }
        if (typingAbort) return;
        if (contacts) {
            contacts.style.display = '';
            contacts.style.opacity = '0';
            contacts.style.transition = 'opacity 0.7s ease';
            void contacts.offsetWidth;
            contacts.style.opacity = '1';
        }
    }

    async function typeEpochInfo(text) {
        epochTypingAbort = true;
        await waitMs(50);
        epochTypingAbort = false;
        infoText.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = text;
        infoText.appendChild(p);
        const chars = [];
        wrapCharsInNode(p, chars);
        for (let i = 0; i < chars.length; i++) {
            if (epochTypingAbort) return;
            chars[i].classList.add('visible');
            if (i % 4 === 0) await waitMs(10);
        }
    }

    function generateAboutCracks() {
        if (!aboutCracks) return;
        aboutCracks.innerHTML = '';
        const theme = getTheme(getActiveThemeKey());
        const MAIN_COLORS = theme.neonMain;
        const BRANCH_COLORS = theme.neonBranch;
        const rect = aboutCracks.getBoundingClientRect();
        const w = rect.width || 800;
        const h = rect.height || 600;
        aboutCracks.setAttribute('viewBox', `0 0 ${w} ${h}`);
        const origins = [
            { x: w / 2, y: 0, angle: Math.PI * 0.25 },
            { x: w, y: h / 2, angle: Math.PI * 0.75 },
            { x: w / 2, y: h, angle: -Math.PI * 0.75 },
            { x: 0, y: h / 2, angle: -Math.PI * 0.25 }
        ];
        origins.forEach(origin => {
            for (let i = 0; i < 4; i++) {
                const baseAngle = origin.angle + (Math.random() - 0.5) * 1.2;
                const length = Math.max(w, h);
                let d = `M ${origin.x} ${origin.y} `;
                let cx = origin.x, cy = origin.y;
                for (let s = 1; s <= 6; s++) {
                    const step = (length / 6) * s;
                    const lateral = (Math.random() - 0.5) * 40;
                    const x = origin.x + Math.cos(baseAngle) * step + Math.cos(baseAngle + Math.PI/2) * lateral;
                    const y = origin.y + Math.sin(baseAngle) * step + Math.sin(baseAngle + Math.PI/2) * lateral;
                    d += `L ${x} ${y} `;
                    cx = x; cy = y;
                }
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', d); path.setAttribute('stroke', MAIN_COLORS[(Math.random() * MAIN_COLORS.length) | 0]);
                path.setAttribute('stroke-width', '2'); path.setAttribute('fill', 'none'); path.setAttribute('opacity', '0.6');
                aboutCracks.appendChild(path);
                const len = path.getTotalLength();
                path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
                path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1500 + Math.random() * 1000, easing: 'ease-out', fill: 'forwards' });
                if (Math.random() < 0.7) {
                    const bAngle = baseAngle + (Math.random() < 0.5 ? -1 : 1) * 1.2;
                    const bLen = 50 + Math.random() * 100;
                    const bp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    bp.setAttribute('d', `M ${cx} ${cy} L ${cx + Math.cos(bAngle) * bLen} ${cy + Math.sin(bAngle) * bLen}`);
                    bp.setAttribute('stroke', BRANCH_COLORS[(Math.random() * BRANCH_COLORS.length) | 0]);
                    bp.setAttribute('stroke-width', '1'); bp.setAttribute('fill', 'none'); bp.setAttribute('opacity', '0.4');
                    aboutCracks.appendChild(bp);
                    const blen = bp.getTotalLength();
                    bp.style.strokeDasharray = blen; bp.style.strokeDashoffset = blen;
                    bp.animate([{ strokeDashoffset: blen }, { strokeDashoffset: 0 }], { duration: 1000, delay: 500, easing: 'ease-out', fill: 'forwards' });
                }
            }
        });
    }
    initAboutObserver();

    // =====================================================================
    // ТЕМЫ
    // =====================================================================
    function getTheme(key) { return EPOCH_THEMES[key] || EPOCH_THEMES.future; }
    function getActiveThemeKey() { return chosenThemeKey || currentThemeKey; }

    function applyTheme(key, smooth) {
        const theme = getTheme(key);
        currentThemeKey = key;
        Array.from(document.body.classList).forEach(cls => {
            if (cls.startsWith('theme-')) document.body.classList.remove(cls);
        });
        document.body.classList.add('theme-' + key);
        const root = document.documentElement.style;
        root.setProperty('--bg-color', theme.bgColor);
        root.setProperty('--crack-glow', theme.glowColor);
        root.setProperty('--scanline-color', theme.scanlineColor);
        root.setProperty('--accent',       theme.accent);
        root.setProperty('--accent-2',     theme.accent2);
        root.setProperty('--accent-soft',  theme.accentSoft);
        root.setProperty('--accent-faint', theme.accentFaint);
        root.setProperty('--btn-bg',       theme.btnBg);
        root.setProperty('--btn-hover-bg', theme.btnHoverBg);
        root.setProperty('--canvas-glow',  theme.canvasGlow);
        root.setProperty('--header-bg',    theme.headerBg);
        if (boardBtn) boardBtn.style.display = (key === 'medieval') ? 'block' : 'none';
        if (!bgPoly) return;
        bgPoly.innerHTML = '';
        if (key === 'future') {
            if (!cachedStarsGroup) {
                cachedStarsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const starCount = isMobile ? 70 : 150;
                for (let i = 0; i < starCount; i++) {
                    const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    star.setAttribute('cx', Math.random() * 1000);
                    star.setAttribute('cy', Math.random() * 1000);
                    star.setAttribute('r', Math.random() * 1.5 + 0.3);
                    star.setAttribute('fill', Math.random() > 0.8 ? '#00eaff' : '#ffffff');
                    star.setAttribute('opacity', Math.random() * 0.8 + 0.2);
                    cachedStarsGroup.appendChild(star);
                }
            }
            bgPoly.appendChild(cachedStarsGroup);
        }
    }

    let cycleTimer = null;
    let cycleIdx = 3;
    function startIdleCycle() {
        if (cycleTimer) return;
        cycleTimer = setInterval(() => {
            cycleIdx = (cycleIdx + 1) % 4;
            currentCycleTheme = ['steam', 'medieval', 'modern', 'future'][cycleIdx];
            if (!isHovering && (state === 'idle' || state === 'epochs')) {
                applyTheme(currentCycleTheme, true);
            }
        }, 5500);
    }
    function stopIdleCycle() {
        if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    }

    function syncScrollState() {
        if (!aboutSection) return;
        if (state === 'broken') {
            document.body.classList.add('scrollable');
            aboutSection.setAttribute('aria-hidden', 'false');
        } else {
            document.body.classList.remove('scrollable');
            aboutSection.setAttribute('aria-hidden', 'true');
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }

    // =====================================================================
    // ЧАСЫ
    // =====================================================================
    function drawClock(time) {
        const themeKey = getActiveThemeKey();
        const c = EPOCH_CLOCKS[themeKey] || EPOCH_CLOCKS.future;
        ctx.clearRect(0, 0, W, H);
        const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, RADIUS);
        grad.addColorStop(0, c.bg1); grad.addColorStop(0.7, c.bg2); grad.addColorStop(1, c.bg3);
        ctx.beginPath(); ctx.arc(W/2, H/2, RADIUS, 0, 2 * Math.PI); ctx.fillStyle = grad; ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 15; ctx.strokeStyle = c.border; ctx.lineWidth = 5; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = c.text; ctx.font = 'bold 24px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 1; i <= 12; i++) {
            const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
            ctx.fillText(i.toString(), W/2 + (RADIUS - 35) * Math.cos(a), H/2 + (RADIUS - 35) * Math.sin(a));
        }
        for (let i = 0; i < 60; i++) {
            const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
            const len = (i % 5 === 0) ? 14 : 8;
            const outerR = RADIUS - 15; const innerR = outerR - len;
            ctx.beginPath(); ctx.moveTo(W/2 + outerR * Math.cos(a), H/2 + outerR * Math.sin(a)); ctx.lineTo(W/2 + innerR * Math.cos(a), H/2 + innerR * Math.sin(a));
            ctx.strokeStyle = c.tick; ctx.lineWidth = (i % 5 === 0) ? 3 : 1.5; ctx.stroke();
        }
        const h = time.getHours() % 12; const m = time.getMinutes(); const s = time.getSeconds() + time.getMilliseconds() / 1000;
        drawHand(ctx, W/2, H/2, RADIUS * 0.5, (h + m/60) / 12 * 2 * Math.PI - Math.PI/2, c.hour, 7);
        drawHand(ctx, W/2, H/2, RADIUS * 0.7, (m + s/60) / 60 * 2 * Math.PI - Math.PI/2, c.min, 5);
        drawHand(ctx, W/2, H/2, RADIUS * 0.8, s / 60 * 2 * Math.PI - Math.PI/2, c.sec, 2.5);
        ctx.beginPath(); ctx.arc(W/2, H/2, 10, 0, 2 * Math.PI); ctx.fillStyle = c.center; ctx.fill(); ctx.strokeStyle = c.text; ctx.lineWidth = 2.5; ctx.stroke();
    }

    function drawHand(c, cx, cy, length, angle, color, width) {
        c.save(); c.translate(cx, cy); c.rotate(angle); c.beginPath(); c.moveTo(0, 0); c.lineTo(length, 0);
        c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 8; c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.stroke(); c.restore();
    }

    function tick(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = timestamp - lastTimestamp; lastTimestamp = timestamp;
        if (isAccelerated) clockTime = new Date(clockTime.getTime() + delta * 300);
        else clockTime = new Date();
        drawClock(clockTime);
        requestAnimationFrame(tick);
    }

    // =====================================================================
    // ТРЕЩИНЫ
    // =====================================================================
    function makeSharpPath(cx, cy, angleRad, startR, endR) {
        const SEG = 4 + ((Math.random() * 4) | 0);
        const dirX = Math.cos(angleRad); const dirY = Math.sin(angleRad);
        const perpX = -dirY; const perpY = dirX;
        const step = (endR - startR) / SEG;
        let d = '';
        for (let i = 0; i <= SEG; i++) {
            const r = startR + step * i;
            const lateral = (i === 0) ? 0 : (Math.random() - 0.5) * (18 + r * 0.06);
            const x = cx + dirX * r + perpX * lateral; const y = cy + dirY * r + perpY * lateral;
            d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
            if (i < SEG) d += ' ';
        }
        return d;
    }

    function generateRadialCracks() {
        cracksMain.innerHTML = ''; cracksBranch.innerHTML = '';
        const theme = getTheme(getActiveThemeKey());
        const MAIN_COLORS = theme.neonMain; const BRANCH_COLORS = theme.neonBranch;
        const cx = 500, cy = 500;
        const COUNT = isMobile ? 6 : 14;
        const START_R = 55; const END_R = 1400; const DURATION = 4200;
        for (let i = 0; i < COUNT; i++) {
            const baseAngle = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
            const d = makeSharpPath(cx, cy, baseAngle, START_R, END_R);
            const color = MAIN_COLORS[(Math.random() * MAIN_COLORS.length) | 0];
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d); path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', (1.6 + Math.random() * 1.4).toFixed(2));
            path.setAttribute('fill', 'none'); path.setAttribute('opacity', (0.85 + Math.random() * 0.15).toFixed(2));
            path.setAttribute('vector-effect', 'non-scaling-stroke');
            cracksMain.appendChild(path);
            const len = path.getTotalLength();
            path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
            path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: DURATION, delay: Math.random() * 350, easing: 'ease-out', fill: 'forwards' });
            const branchCount = isMobile ? 1 : (2 + ((Math.random() * 2) | 0));
            for (let b = 0; b < branchCount; b++) {
                const p = getRandomPointOnPath(d); if (!p) continue;
                const branchAngle = baseAngle + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.7);
                const brLen = 90 + Math.random() * 220;
                const { d: bd } = makeBranchPath(p.x, p.y, branchAngle, brLen);
                const bp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                bp.setAttribute('d', bd); bp.setAttribute('stroke', BRANCH_COLORS[(Math.random() * BRANCH_COLORS.length) | 0]);
                bp.setAttribute('stroke-width', (0.6 + Math.random() * 0.8).toFixed(2));
                bp.setAttribute('fill', 'none'); bp.setAttribute('opacity', (0.55 + Math.random() * 0.35).toFixed(2));
                bp.setAttribute('vector-effect', 'non-scaling-stroke');
                cracksBranch.appendChild(bp);
                const blen = bp.getTotalLength();
                bp.style.strokeDasharray = blen; bp.style.strokeDashoffset = blen;
                bp.animate([{ strokeDashoffset: blen }, { strokeDashoffset: 0 }], { duration: DURATION * 0.75, delay: 700 + Math.random() * 800, easing: 'ease-out', fill: 'forwards' });
            }
        }
    }

    function makeBranchPath(x0, y0, angleRad, length) {
        const SEG = 2 + ((Math.random() * 2) | 0);
        const dirX = Math.cos(angleRad); const dirY = Math.sin(angleRad);
        const perpX = -dirY; const perpY = dirX;
        let d = 'M' + x0.toFixed(1) + ',' + y0.toFixed(1);
        let cx = x0, cy = y0;
        const step = length / SEG;
        for (let i = 1; i <= SEG; i++) {
            const lateral = (Math.random() - 0.5) * (step * 0.9);
            cx = x0 + dirX * step * i + perpX * lateral; cy = y0 + dirY * step * i + perpY * lateral;
            d += ' L' + cx.toFixed(1) + ',' + cy.toFixed(1);
        }
        return { d, endX: cx, endY: cy };
    }

    function getRandomPointOnPath(d) {
        const segs = d.split(/\s+L\s+/);
        if (segs.length < 2) return null;
        const idx = 1 + ((Math.random() * (segs.length - 1)) | 0);
        const raw = segs[idx]; const [x, y] = raw.split(',').map(Number);
        return { x, y };
    }

    // =====================================================================
    // UI ФАЗЫ
    // =====================================================================
    function showEpochButtons() { epochBtnEls.forEach(b => b.classList.add('show')); }
    function hideEpochButtons() { epochBtnEls.forEach(b => b.classList.remove('show')); }
    function showHeader() { header.classList.add('show'); }

    function hideAllTabs() {
        if (teamTab) teamTab.style.display = 'none';
        if (boardTab) boardTab.style.display = 'none';
        document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
    }
    function showMain() { hideAllTabs(); if (mainView) mainView.style.display = 'flex'; }
    function showTeam() { hideAllTabs(); if (teamTab) teamTab.style.display = 'flex'; }

    function startEpochPhase() {
        state = 'epochs';
        isAccelerated = true;
        chosenThemeKey = null;
        syncScrollState();
        typingAbort = true;
        if (aboutCracks) aboutCracks.innerHTML = '';
        aboutTypingStarted = false;
        if (aboutContent) aboutContent.innerHTML = TEXTS[currentLang].aboutHTML;
        initAboutObserver();
        setTimeout(showEpochButtons, 200);
    }

    function openEpochModal(epochKey) {
        selectedEpoch = epochKey; chosenThemeKey = epochKey;
        state = 'modal'; hideEpochButtons();
        stopIdleCycle();
        applyTheme(epochKey, true);
        syncScrollState();
        const t = TEXTS[currentLang];

        // ЛОГИКА ДОСТУПА К ЭПОХАМ
        if (epochKey === 'medieval' || isAdmin) {
            modalCreateBtn.disabled = false;
            modalCreateBtn.textContent = t.btnCreate;
        } else {
            modalCreateBtn.disabled = true;
            modalCreateBtn.textContent = t.btnUnavailable;
        }

        setTimeout(() => {
            epochNameEl.textContent = t.epochs[epochKey] || epochKey;
            epochModalText.firstChild.textContent = t.modalText;
            epochModal.classList.add('show');
        }, 380);
    }

    function closeEpochModal() { epochModal.classList.remove('show'); }

    function confirmCharacter() {
        epochModalText.firstChild.textContent = TEXTS[currentLang].modalCreated;
        modalCreateBtn.disabled = true; modalBackBtn.disabled = true; modalAboutEpochBtn.disabled = true;
        setTimeout(() => {
            mainView.classList.add('fade'); closeEpochModal();
            setTimeout(() => {
                isAccelerated = false; selectedEpoch = null; state = 'ready'; syncScrollState();
                modalCreateBtn.disabled = false; modalBackBtn.disabled = false; modalAboutEpochBtn.disabled = false;
                mainView.classList.remove('fade');
            }, 500);
        }, 1100);
    }

    function startBreakingPhase() {
        state = 'breaking'; isAccelerated = true; generateRadialCracks();
        clearTimeout(headerTimer);
        headerTimer = setTimeout(() => {
            showHeader(); state = 'broken'; syncScrollState();
        }, 3000);
    }

    // =====================================================================
    // ОБРАБОТЧИКИ
    // =====================================================================
    canvas.addEventListener('click', () => {
        if (state === 'idle') startEpochPhase();
        else if (state === 'ready') startBreakingPhase();
    });

    epochBtnEls.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); if (state !== 'epochs') return;
            openEpochModal(btn.dataset.epoch);
        });
        if (!isTouch) {
            btn.addEventListener('mouseenter', () => {
                if (state !== 'epochs') return;
                isHovering = true;
                applyTheme(btn.dataset.epoch, true);
            });
            btn.addEventListener('mouseleave', () => {
                if (state !== 'epochs') return;
                isHovering = false;
                applyTheme(currentCycleTheme, true);
            });
        }
    });

    modalBackBtn.addEventListener('click', () => {
        if (state !== 'modal') return;
        closeEpochModal();
        state = 'epochs';
        chosenThemeKey = null;
        startIdleCycle();
        syncScrollState();
        setTimeout(showEpochButtons, 300);
    });

    modalAboutEpochBtn.addEventListener('click', () => {
        if (state !== 'modal' || !selectedEpoch) return;
        const info = EPOCH_INFO[selectedEpoch][currentLang];
        if (!info) return;
        infoTitle.textContent = info.title;
        infoPanel.classList.add('show');
        typeEpochInfo(info.text);
    });

    modalCreateBtn.addEventListener('click', () => {
        if (state !== 'modal') return; confirmCharacter();
    });

    epochModal.addEventListener('click', (e) => {
        if (e.target === epochModal && state === 'modal') modalBackBtn.click();
    });

    infoCloseBtn.addEventListener('click', () => {
        epochTypingAbort = true;
        infoPanel.classList.remove('show');
    });

    infoPanel.addEventListener('click', (e) => {
        if (e.target === infoPanel) {
            epochTypingAbort = true;
            infoPanel.classList.remove('show');
        }
    });

    homeBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showMain(); syncScrollState();
    });

    if (teamBtn && teamTab) teamBtn.addEventListener('click', showTeam);
    if (boardBtn && boardTab) {
        boardBtn.addEventListener('click', () => {
            hideAllTabs(); boardTab.style.display = 'flex';
        });
    }
    document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', showMain));

    applyTheme('future', false);
    currentCycleTheme = 'future';
    clockTime = new Date();
    tick(performance.now());
    startIdleCycle();
})();
