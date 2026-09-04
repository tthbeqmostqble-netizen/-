const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// تعديل ليعمل مع المجلد الرئيسي الذي يحتوي على index.html
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};

// بنك الأسئلة مصنف حسب الفئات والمستويات
const questionBanks = {
    quran: {
        easy: [
            { question: "أكمل الآية: {إِنَّ مَعَ الْعُسْرِ ...}", options: ["سُرُورًا", "فَرَجًا", "يُسْرًا", "رَحْمَةً"], correct: 2 },
            { question: "أكمل الآية: {وَقُلْ رَبِّ زِدْنِي ...}", options: ["فَهْمًا", "عِلْمًا", "نُورًا", "حِكْمَةً"], correct: 1 }
        ],
        hard: [
            { question: "أكمل الآية: {وَضَرَبَ لَنَا مَثَلًا وَنَسِيَ خَلْقَهُ قَالَ مَنْ يُحْيِي الْعِظَامَ وَهِيَ ...}", options: ["رَمِيمٌ", "حَيَّةٌ", "جَدِيدَةٌ", "سَاتِرَةٌ"], correct: 0 },
            { question: "أكمل الآية: {وَالسَّامِقَاتِ لَهَا طَلْعٌ ...}", options: ["نَضِيدٌ", "كَرِيمٌ", "مُبِينٌ", "عَظِيمٌ"], correct: 0 }
        ]
    },
    ahlulbayt: {
        easy: [
            { question: "من هو الإمام الأول عند الشيعة؟", options: ["الإمام الحسين", "الإمام علي", "الإمام الحسن", "الإمام الباقر"], correct: 1 },
            { question: "ما لقب الإمام علي بن أبي طالب عليه السلام المشهور؟", options: ["أسد الله الغالب", "سفينة النجاة", "قمر بني هاشم", "زين العابدين"], correct: 0 }
        ],
        hard: [
            { question: "في أي سنة هجْرية وقعت واقعة الطف الأليمة في كربلاء؟", options: ["60 هـ", "61 هـ", "65 هـ", "70 هـ"], correct: 1 },
            { question: "من هو صاحب كتاب الصحيفة السجادية؟", options: ["الإمام علي", "الإمام السجاد", "الإمام الصادق", "الإمام الكاظم"], correct: 1 }
        ]
    },
    wisdom: {
        easy: [
            { question: "من أقوال الإمام علي (ع): (الناس نيام فإذا ماتوا ...)", options: ["استيقظوا", "انتبهوا", "رجعوا", "علموا"], correct: 0 },
            { question: "قيمة كل امرئ ما ...", options: ["يملك", "يحسن", "يعلم", "يقول"], correct: 1 }
        ],
        hard: [
            { question: "من وصايا الإمام علي (ع) لحسن بن علي: (اعقلوا الخبر إذا سمعتموه عقل ...)", options: ["رعاية لا عقل دراية", "دراية لا عقل رواية", "فهم لا حفظ", "حكمة لا نقل"], correct: 1 }
        ]
    }
};

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('create-room', ({ playerName, maxPlayers, category, difficulty }) => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const limit = parseInt(maxPlayers) || 10;

        const selectedQuestions = [...(questionBanks[category]?.[difficulty] || questionBanks.quran.easy)];
        selectedQuestions.sort(() => Math.random() - 0.5);

        rooms[roomCode] = {
            host: socket.id,
            maxPlayers: limit,
            players: [{ id: socket.id, name: playerName, score: 0 }],
            gameStarted: false,
            questions: selectedQuestions,
            currentQuestionIndex: 0,
            answersCount: 0
        };

        socket.join(roomCode);
        socket.emit('room-created', { roomCode, players: rooms[roomCode].players });
    });

    socket.on('join-room', ({ playerName, roomCode }) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('error-msg', 'الغرفة غير موجودة!');
        if (room.gameStarted) return socket.emit('error-msg', 'لقد بدأت اللعبة بالفعل!');
        if (room.players.length >= room.maxPlayers) return socket.emit('error-msg', 'الغرفة ممتلئة!');

        room.players.push({ id: socket.id, name: playerName, score: 0 });
        socket.join(roomCode);

        socket.emit('room-joined', { roomCode, players: room.players });
        io.to(roomCode).emit('update-players', room.players);
    });

    socket.on('start-game', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            room.gameStarted = true;
            room.currentQuestionIndex = 0;
            room.answersCount = 0;
            
            io.to(roomCode).emit('game-started');
            sendQuestionToRoom(roomCode);
        }
    });

    socket.on('submit-answer', ({ roomCode, answerIndex }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const currentQ = room.questions[room.currentQuestionIndex];
        let isCorrect = (answerIndex === currentQ.correct);
        let pointsEarned = 0;

        if (isCorrect) {
            pointsEarned = 10;
            player.score += pointsEarned;
        }

        room.answersCount++;

        socket.emit('waiting-for-others', {
            isCorrect,
            pointsEarned,
            correctAnswerText: currentQ.options[currentQ.correct]
        });

        io.to(roomCode).emit('update-players', room.players);

        if (room.answersCount >= room.players.length) {
            room.currentQuestionIndex++;
            room.answersCount = 0;

            setTimeout(() => {
                if (room.currentQuestionIndex < room.questions.length) {
                    sendQuestionToRoom(roomCode);
                } else {
                    io.to(roomCode).emit('game-over', room.players);
                }
            }, 2000);
        }
    });

    socket.on('disconnect', () => {
        console.log('مستخدم انقطع اتصاله:', socket.id);
    });
});

function sendQuestionToRoom(roomCode) {
    const room = rooms[roomCode];
    const q = room.questions[room.currentQuestionIndex];
    io.to(roomCode).emit('new-question', {
        question: q.question,
        options: q.options,
        questionIndex: room.currentQuestionIndex,
        total: room.questions.length
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
