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

// بنك الأسئلة الموسع (50 سؤالاً موزعة)
const questionBanks = {
    quran: {
        easy: [
            { question: "أكمل الآية: {إِنَّ مَعَ الْعُسْرِ ...}", options: ["سُرُورًا", "فَرَجًا", "يُسْرًا", "رَحْمَةً"], correct: 2 },
            { question: "أكمل الآية: {وَقُلْ رَبِّ زِدْنِي ...}", options: ["فَهْمًا", "عِلْمًا", "نُورًا", "حِكْمَةً"], correct: 1 },
            { question: "كم سورة في القرآن الكريم؟", options: ["112", "114", "120", "110"], correct: 1 },
            { question: "ما هي أطول سورة في القرآن الكريم؟", options: ["آل عمران", "البقرة", "النساء", "المائدة"], correct: 1 },
            { question: "ما هي أقصر سورة في القرآن الكريم؟", options: ["الإخلاص", "الكوثر", "العصر", "الفلق"], correct: 1 },
            { question: "في أي سورة تقع آية الكرسي؟", options: ["البقرة", "آل عمران", "الأنعام", "الأعراف"], correct: 0 },
            { question: "كم عدد السور المكية في القرآن تقريباً؟", options: ["86 سورة", "28 سورة", "50 سورة", "100 سورة"], correct: 0 },
            { question: "ما هي السورة التي تسمى قلب القرآن؟", options: ["الرحمن", "يس", "الملك", "الواقعة"], correct: 1 },
            { question: "أي سورة تبدأ بدون بسملة؟", options: ["التوبة", "الأنفال", "محمد", "الفتح"], correct: 0 },
            { question: "كم مرة ذكر اسم النبي محمد صلى الله عليه وآله في القرآن الكريم؟", options: ["مرتان", "أربع مرات", "عشر مرات", "عشرون مرة"], correct: 1 }
        ],
        hard: [
            { question: "أكمل الآية: {وَضَرَبَ لَنَا مَثَلًا وَنَسِيَ خَلْقَهُ قَالَ مَنْ يُحْيِي الْعِظَامَ وَهِيَ ...}", options: ["رَمِيمٌ", "حَيَّةٌ", "جَدِيدَةٌ", "سَاتِرَةٌ"], correct: 0 },
            { question: "أكمل الآية: {وَالسَّامِقَاتِ لَهَا طَلْعٌ ...}", options: ["نَضِيدٌ", "كَرِيمٌ", "مُبِينٌ", "عَظِيمٌ"], correct: 0 },
            { question: "ما هي السورة التي ذكرت فيها البسملة مرتين؟", options: ["النمل", "التوبة", "هود", "يوسف"], correct: 0 },
            { question: "ما هو الجزء الذي يحتوي على سورة الملك؟", options: ["الجزء 28", "الجزء 29", "الجزء 30", "الجزء 27"], correct: 1 },
            { question: "كم عدد السجدات الواجبة (أو المندوبة المشهورة) في القرآن الكريم؟", options: ["4 سجدات", "15 سجدة", "10 سجدات", "7 سجدات"], correct: 1 },
            { question: "في أي جزء تقع سورة كهف؟", options: ["الجزء 15 و 16", "الجزء 18", "الجزء 20", "الجزء 10"], correct: 0 },
            { question: "ما هي السورة التي أُنزلت كاملة؟", options: ["المدثر", "الأنعام", "الفاتحة", "الحجرات"], correct: 1 },
            { question: "كم عدد حزب القرآن الكريم كاملاً؟", options: ["30 حزباً", "60 حزباً", "120 حزباً", "40 حزباً"], correct: 1 },
            { question: "ما هي السورة التي تُعرف بعروس القرآن؟", options: ["الرحمن", "الملك", "الواقعة", "يس"], correct: 0 },
            { question: "ما هي السورة التي نزلت في فضائل أهل البيت (هل أتى)؟", options: ["الإنسان (الدهر)", "الإنسان والقدر", "الكوثر فقط", "الواقعة"], correct: 0 }
        ]
    },
    ahlulbayt: {
        easy: [
            { question: "من هو الإمام الأول عند الشيعة؟", options: ["الإمام الحسين", "الإمام علي", "الإمام الحسن", "الإمام الباقر"], correct: 1 },
            { question: "ما لقب الإمام علي بن أبي طالب عليه السلام المشهور؟", options: ["أسد الله الغالب", "سفينة النجاة", "قمر بني هاشم", "زين العابدين"], correct: 0 },
            { question: "من هي فاطمة الزهراء عليها السلام بالنسبة للنبي محمد (ص)؟", options: ["ابنته", "أخته", "زوجته", "عمته"], correct: 0 },
            { question: "من هو الإمام الثاني؟", options: ["الإمام الحسن", "الإمام الحسين", "الإمام علي السجاد", "الإمام الكاظم"], correct: 0 },
            { question: "من هو شهيد كربلاء الإمام الثالث؟", options: ["الإمام الحسين", "الإمام جعفر الصادق", "الإمام رضا", "الإمام الهادي"], correct: 0 },
            { question: "ما لقب الإمام الحسين عليه السلام الشهير؟", options: ["سيد الشهداء", "الكاظم", "الرضا", "التقي"], correct: 0 },
            { question: "من هو أبو الفضل العباس بالنسبة للإمام الحسين؟", options: ["أخوه", "ابنه", "عمه", "ابن عمه"], correct: 0 },
            { question: "من هي أم الأئمة والمضحية الكبرى في كربلاء؟", options: ["السيدة زينب", "السيدة فاطمة الزهراء", "أم البنين", "خديجة الكبرى"], correct: 2 },
            { question: "ما هو لقب الإمام علي بن الحسين عليه السلام؟", options: ["زين العابدين", "باقر العلوم", "الصادق", "الرضا"], correct: 0 },
            { question: "في أي مدينة مرقد الإمام الرضا عليه السلام؟", options: ["مشهد المقدسة", "كربلاء", "النجف الأشرف", "الكاظمية"], correct: 0 }
        ],
        hard: [
            { question: "في أي سنة هجْرية وقعت واقعة الطف الأليمة في كربلاء؟", options: ["60 هـ", "61 هـ", "65 هـ", "70 هـ"], correct: 1 },
            { question: "من هو صاحب كتاب الصحيفة السجادية؟", options: ["الإمام علي", "الإمام السجاد", "الإمام الصادق", "الإمام الكاظم"], correct: 1 },
            { question: "كم استمرت إمامة الإمام المهدي المنتظر (عج) في غيبته الصغرى تقريباً؟", options: ["69 سنة", "70 سنة", "10 سنوات", "100 سنة"], correct: 1 },
            { question: "من هو الإمام الذي لقب بـ (باب الحوائج)؟", options: ["الإمام موسى الكاظم", "الإمام محمد الجواد", "الإمام علي الهادي", "الإمام الحسن العسكري"], correct: 0 },
            { question: "من هو صاحب كتاب نهج البلاغة الذي جمع خطب الإمام علي؟", options: ["الشريف الرضي", "الشيخ الطوسي", "الكليني", "المجلسي"], correct: 0 },
            { question: "ما هي سنة ولادة الإمام الحجة المنتظر عجل الله فرجه؟", options: ["255 هـ", "260 هـ", "250 هـ", "270 هـ"], correct: 0 },
            { question: "من هو الإمام المدفون في سامراء مع الإمام العسكري؟", options: ["الإمام علي الهادي", "الإمام محمد الجواد", "الإمام جعفر الصادق", "الإمام الرضا"], correct: 0 },
            { question: "كم عدد الأئمة المعصومين عليهم السلام من عترة النبي؟", options: ["10 أئمة", "12 إماماً", "14 معصوماً", "7 أئمة"], correct: 1 },
            { question: "من هو الإمام الذي أُسس في عصره أكبر جامعة فقهية (مدرسة أهل البيت)؟", options: ["الإمام جعفر الصادق", "الإمام الباقر", "الإمام علي", "الإمام الحسن"], correct: 0 },
            { question: "ما هو اسم زوجة الإمام علي بن أبي طالب الأولى وابنة رسول الله؟", options: ["فاطمة الزهراء", "أم كلثوم", "أسماء", "فاطمة بنت حام"], correct: 0 }
        ]
    },
    wisdom: {
        easy: [
            { question: "من أقوال الإمام علي (ع): (الناس نيام فإذا ماتوا ...)", options: ["استيقظوا", "انتبهوا", "رجعوا", "علموا"], correct: 0 },
            { question: "قيمة كل امرئ ما ...", options: ["يملك", "يحسن", "يعلم", "يقول"], correct: 1 },
            { question: "من ضيع الدين ضاع ...", options: ["عمره", "أمله", "ماله", "مستقبله"], correct: 1 },
            { question: "صديقك من صدقك لا من ...", options: ["صدّقك", "جاملك", "أعطاك", "فارقك"], correct: 1 },
            { question: "من كرمت عليه نفسه هانت عليه ...", options: ["الدنيا", "الشهوات", "الناس", "الأموال"], correct: 1 },
            { question: "العلم كنز لا يفنى و ... خير لا ينقطع", options: ["العدل", "المال", "العمل", "الصمت"], correct: 1 },
            { question: "توقوا الذنوب فما من بلية إلا وسببها ...", options: ["معصية", "فقر", "جهل", "كسل"], correct: 0 },
            { question: "من حاسب نفسه ...", options: ["ربح", "خسر", "سعد", "تعب"], correct: 0 },
            { question: "العدل أساس ...", options: ["الملك والتقدم", "النجاح", "السعادة", "القوة"], correct: 0 },
            { question: "اكتساب الغنى العقل لا ...", options: ["المال", "الجهد", "السفر", "العمل"], correct: 0 }
        ],
        hard: [
            { question: "من وصايا الإمام علي (ع) لحسن بن علي: (اعقلوا الخبر إذا سمعتموه عقل ...)", options: ["رعاية لا عقل دراية", "دراية لا عقل رواية", "فهم لا حفظ", "حكمة لا نقل"], correct: 1 },
            { question: "من كلامه (ع): (اعرف الحق تعرف ...)", options: ["أهله", "أعداءه", "طريقه", "وقته"], correct: 0 },
            { question: "قال الإمام علي (ع): (أشرف الغنى ترك ...)", options: ["المال", "المناصب", "المنى", "الطمع"], correct: 3 },
            { question: "من قصر في العمل ابتلي بـ ...", options: ["الهم", "الفقر", "المرض", "الكسل"], correct: 0 },
            { question: "الناس أعداء ما ...", options: ["جهلوا", "خالفوا", "عرفوا", "ظلموا"], correct: 0 },
            { question: "من استبد برأيه ...", options: ["هلك", "نجا", "سعد", "ساد"], correct: 0 },
            { question: "رأي الشيخ أحب إلينا من جلد ...", options: ["الغلام", "الشاب", "الرجل", "الحكيم"], correct: 0 },
            { question: "أعقل الناس من عيب نفسه ...", options: ["أبصر", "ستر", "صلح", "أصلح"], correct: 0 },
            { question: "البخيل عاجل في الدنيا حبس المترفين و... في الآخرة حساب", options: ["طويل", "شديد", "مؤلم", "كبير"], correct: 0 },
            { question: "من أعظم الخطايا اللجاجة في ...", options: ["الباطل", "الخصام", "الأمر", "القول"], correct: 0 }
        ]
    }
};

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('create-room', ({ playerName, maxPlayers, category, difficulty, questionCount }) => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const limit = parseInt(maxPlayers) || 10;
        const count = parseInt(questionCount) || 10;

        let availableQuestions = [...(questionBanks[category]?.[difficulty] || questionBanks.quran.easy)];
        availableQuestions.sort(() => Math.random() - 0.5);
        
        // أخذ العدد المطلوب من الأسئلة أو المتوفر كحد أقصى
        const selectedQuestions = availableQuestions.slice(0, count);

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
