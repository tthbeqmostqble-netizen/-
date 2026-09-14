const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};

const questionBanks = {
    quran: {
        easy: [
            { question: "أكمل الآية: {إِنَّ مَعَ الْعُسْرِ ...}", options: ["سُرُورًا", "فَرَجًا", "يُسْرًا", "رَحْمَةً"], answerText: "يُسْرًا", surah: "الشرح" },
            { question: "أكمل الآية: {وَقُلْ رَبِّ زِدْنِي ...}", options: ["فَهْمًا", "عِلْمًا", "نُورًا", "حِكْمَةً"], answerText: "عِلْمًا", surah: "طه" },
            { question: "أكمل الآية: {قُلْ هُوَ اللَّهُ ...}", options: ["أَحَدٌ", "الصَّمَدُ", "الرَّحْمَنُ", "الْخَالِقُ"], answerText: "أَحَدٌ", surah: "الإخلاص" },
            { question: "أكمل الآية: {إِنَّا أَعْطَيْنَاكَ الْ...}", options: ["الخير", "الْكَوْثَرَ", "النور", "الفتح"], answerText: "الْكَوْثَرَ", surah: "الكوثر" },
            { question: "أكمل الآية: {فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ ...}", options: ["رَحِيمًا", "تَوَّابًا", "غَفُورًا", "سَمِيعًا"], answerText: "تَوَّابًا", surah: "النصر" }
        ],
        hard: [
            { question: "أكمل الآية: {أُولئِكَ عَلَيْهِمْ صَلَواتٌ مِنْ رَبِّهِمْ وَ رَحْمَةٌ وَ أُولئِكَ هُمُ...}", options: ["الْمُهْتَدُونَ", "المُفْلِحُونَ", "المُتَقُونَ", "الفَائِزُونَ"], answerText: "الْمُهْتَدُونَ", surah: "البقرة" },
            { question: "أكمل الآية: {وَالسَّامِقَاتِ لَهَا طَلْعٌ ...}", options: ["نَضِيدٌ", "ظَهِيرٌ", "مُبِينٌ", "عَظِيمٌ"], answerText: "نَضِيدٌ", surah: "ق" },
            { question: "أكمل الآية: {وَالشَّمْسِ وَضُحَاهَا * وَالْقَمَرِ إِذَا ...}", options: ["تَلَاهَا", "جَلَاهَا", "يَغْشَاهَا", "أَمَرَهَا"], answerText: "تَلَاهَا", surah: "الشمس" }
        ]
    }
};

function normalizeText(text) {
    if (!text) return "";
    return text
        .replace(/[\u064B-\u0652]/g, "")
        .replace(/^[وإفبلكت]*ال/, "")
        .replace(/^ال/, "")
        .replace(/\s+/g, "")
        .trim();
}

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('createRoom', ({ playerName, maxPlayers, timeLimit, totalQuestions, difficulty, scoringMode }) => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const limit = parseInt(maxPlayers) || 10;
        const count = parseInt(totalQuestions) || 5;

        let availableQuestions = [];
        if (difficulty === 'easy') {
            availableQuestions = [...questionBanks.quran.easy];
        } else if (difficulty === 'hard') {
            availableQuestions = [...questionBanks.quran.hard];
        } else {
            availableQuestions = [...questionBanks.quran.easy, ...questionBanks.quran.hard];
        }

        availableQuestions.sort(() => Math.random() - 0.5);
        const selectedQuestions = availableQuestions.slice(0, count);

        rooms[roomCode] = {
            host: socket.id,
            maxPlayers: limit,
            timeLimit: parseInt(timeLimit) || 60,
            difficulty: difficulty,
            totalQuestions: count,
            scoringMode: scoringMode || 'speed',
            players: [{ id: socket.id, name: playerName, score: 0, correctCount: 0, wrongCount: 0, answerHistory: [] }],
            gameStarted: false,
            questions: selectedQuestions,
            currentQuestionIndex: 0,
            questionStartTime: 0,
            questionTimer: null
        };

        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    });

    socket.on('joinRoom', ({ playerName, roomCode }) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('errorMsg', 'الغرفة غير موجودة!');
        if (room.gameStarted) return socket.emit('errorMsg', 'لقد بدأت اللعبة بالفعل!');
        if (room.players.length >= room.maxPlayers) return socket.emit('errorMsg', 'الغرفة ممتلئة!');

        room.players.push({ id: socket.id, name: playerName, score: 0, correctCount: 0, wrongCount: 0, answerHistory: [] });
        socket.join(roomCode);

        io.to(roomCode).emit('updatePlayers', room.players);
    });

    socket.on('startGame', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.host === socket.id) {
            room.gameStarted = true;
            room.currentQuestionIndex = 0;
            sendQuestionToRoom(roomCode);
        }
    });

    socket.on('restartGame', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room) {
            if (room.questionTimer) clearTimeout(room.questionTimer);
            room.players.forEach(p => {
                p.score = 0;
                p.correctCount = 0;
                p.wrongCount = 0;
                p.answerHistory = [];
            });
            room.currentQuestionIndex = 0;
            
            let availableQuestions = [];
            if (room.difficulty === 'easy') {
                availableQuestions = [...questionBanks.quran.easy];
            } else if (room.difficulty === 'hard') {
                availableQuestions = [...questionBanks.quran.hard];
            } else {
                availableQuestions = [...questionBanks.quran.easy, ...questionBanks.quran.hard];
            }
            availableQuestions.sort(() => Math.random() - 0.5);
            room.questions = availableQuestions.slice(0, room.totalQuestions);

            // 1. إخبار جميع اللاعبين في الغرفة بإعادة ضبط الواجهة وتنظيف شاشة النتائج
            io.to(roomCode).emit('gameRestarted');

            // 2. إرسال السؤال الأول من جديد لبدء المسابقة فوراً
            sendQuestionToRoom(roomCode);
        }
    });

    socket.on('submitAnswer', ({ roomCode, selectedAnswer }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const alreadyAnswered = player.answerHistory && player.answerHistory.some(a => a.questionIndex === room.currentQuestionIndex);
        if (alreadyAnswered) return;

        const currentQ = room.questions[room.currentQuestionIndex];
        const isCorrect = (normalizeText(selectedAnswer) === normalizeText(currentQ.answerText));

        if (!player.answerHistory) player.answerHistory = [];
        player.answerHistory.push({
            questionIndex: room.currentQuestionIndex,
            question: currentQ.question,
            surah: currentQ.surah,
            selectedAnswer: selectedAnswer,
            correctAnswer: currentQ.answerText,
            isCorrect: isCorrect
        });

        socket.emit('answerResult', { correct: isCorrect });

        if (isCorrect) {
            player.correctCount += 1;
            if (room.scoringMode === 'speed') {
                const elapsedTime = (Date.now() - room.questionStartTime) / 1000;
                const timeLeft = Math.max(0, room.timeLimit - elapsedTime);
                const pointsEarned = Math.round(5 + (timeLeft / room.timeLimit) * 15);
                player.score += pointsEarned;
            } else {
                player.score += 10;
            }
        } else {
            player.wrongCount += 1;
        }

        io.to(roomCode).emit('updateScoreboardOnly', { players: room.players });

        const allAnswered = room.players.every(p => {
            return p.answerHistory && p.answerHistory.some(a => a.questionIndex === room.currentQuestionIndex);
        });

        if (allAnswered) {
            if (room.questionTimer) clearTimeout(room.questionTimer);
            proceedToNextQuestion(roomCode);
        }
    });

    socket.on('disconnect', () => {
        console.log('مستخدم انقطع اتصاله:', socket.id);
    });
});

function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const q = room.questions[room.currentQuestionIndex];
    room.questionStartTime = Date.now();
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);

    io.to(roomCode).emit('newQuestion', {
        text: q.question,
        options: shuffledOptions,
        surah: q.surah,
        timeLimit: room.timeLimit,
        questionNumber: room.currentQuestionIndex + 1,
        total: room.questions.length
    });

    if (room.questionTimer) clearTimeout(room.questionTimer);
    
    room.questionTimer = setTimeout(() => {
        room.players.forEach(p => {
            if (!p.answerHistory) p.answerHistory = [];
            const answered = p.answerHistory.some(a => a.questionIndex === room.currentQuestionIndex);
            if (!answered) {
                p.wrongCount += 1;
                p.answerHistory.push({
                    questionIndex: room.currentQuestionIndex,
                    question: q.question,
                    surah: q.surah,
                    selectedAnswer: "انتهى الوقت (لم يجب)",
                    correctAnswer: q.answerText,
                    isCorrect: false
                });
            }
        });

        proceedToNextQuestion(roomCode);
    }, room.timeLimit * 1000);
}

function proceedToNextQuestion(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.questionTimer) clearTimeout(room.questionTimer);

    const currentQ = room.questions[room.currentQuestionIndex];

    io.to(roomCode).emit('correctAnswerAnnouncement', {
        surah: currentQ.surah,
        fullAyah: currentQ.answerText,
        players: room.players
    });

    room.currentQuestionIndex++;

    setTimeout(() => {
        if (room.currentQuestionIndex < room.questions.length) {
            sendQuestionToRoom(roomCode);
        } else {
            io.to(roomCode).emit('gameOver', { players: room.players });
        }
    }, 3000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
