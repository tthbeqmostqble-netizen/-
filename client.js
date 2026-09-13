const socket = io();

let myRoomCode = '';
let isHost = false;
let currentOptions = [];
let timerInterval;

function showRoomOptions() {
    const name = document.getElementById('player-name').value;
    if (!name) return alert('الرجاء إدخال الاسم أولاً');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('create-room-screen').classList.remove('hidden');
    isHost = true;
}

function showJoinScreen() {
    const name = document.getElementById('player-name').value;
    if (!name) return alert('الرجاء إدخال الاسم أولاً');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('join-room-screen').classList.remove('hidden');
}

function createRoom() {
    const name = document.getElementById('player-name').value;
    const maxPlayers = document.getElementById('max-players').value;
    const timeLimit = document.getElementById('time-limit').value;
    const difficulty = document.getElementById('difficulty').value;
    const totalQuestions = document.getElementById('total-questions').value;
    const scoringMode = document.getElementById('scoring-mode').value;

    socket.emit('createRoom', { playerName: name, maxPlayers, timeLimit, totalQuestions, difficulty, scoringMode });
}

function joinRoom() {
    const name = document.getElementById('player-name').value;
    const roomCode = document.getElementById('room-code-input').value.toUpperCase();
    if (!roomCode) return alert('الرجاء إدخال كود الغرفة');
    myRoomCode = roomCode;
    socket.emit('joinRoom', { playerName: name, roomCode });
}

socket.on('roomCreated', ({ roomCode }) => {
    myRoomCode = roomCode;
    document.getElementById('create-room-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = roomCode;
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('wait-msg').classList.add('hidden');
});

socket.on('errorMsg', (msg) => {
    alert(msg);
});

socket.on('updatePlayers', (players) => {
    document.getElementById('join-room-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = myRoomCode;

    if (!isHost) {
        document.getElementById('start-btn').classList.add('hidden');
        document.getElementById('wait-msg').classList.remove('hidden');
    }

    const list = document.getElementById('players-list');
    list.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.innerText = `${p.name} (النقاط: ${p.score})`;
        list.appendChild(li);
    });
});

function startGame() {
    socket.emit('startGame', { roomCode: myRoomCode });
}

// الاستماع لحدث إعادة تشغيل اللعبة لتنظيف واجهة النتائج وإعادتها لوضع اللعب
socket.on('gameRestarted', () => {
    const gameScreen = document.getElementById('game-screen');
    gameScreen.innerHTML = `
        <div class="game-header">
            <span id="q-counter">السؤال: 1/--</span>
            <span id="surah-title">سورة: --</span>
            <span id="timer">الوقت: <span id="time-left">--</span>ث</span>
        </div>
        <h2 id="question-text">جارِ التحميل...</h2>
        <div class="options-container">
            <button id="opt-0" class="opt-btn" onclick="chooseOption(0)"></button>
            <button id="opt-1" class="opt-btn" onclick="chooseOption(1)"></button>
            <button id="opt-2" class="opt-btn" onclick="chooseOption(2)"></button>
            <button id="opt-3" class="opt-btn" onclick="chooseOption(3)"></button>
        </div>
        <p id="feedback" style="font-weight: bold; margin-top: 15px;"></p>
        <div id="scoreboard-container" style="margin-top: 20px;">
            <h3>لوحة النتائج المباشرة:</h3>
            <ul id="scoreboard"></ul>
        </div>
    `;
});

socket.on('newQuestion', ({ text, options, surah, timeLimit, questionNumber, total }) => {
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('question-text').innerText = text;
    document.getElementById('surah-title').innerText = `سورة: ${surah}`;
    document.getElementById('q-counter').innerText = `السؤال: ${questionNumber}/${total}`;
    document.getElementById('feedback').innerText = '';

    currentOptions = options;
    
    for (let i = 0; i < 4; i++) {
        const btn = document.getElementById(`opt-${i}`);
        if (btn) {
            btn.innerText = options[i];
            btn.disabled = false;
            btn.style.background = '#3498db';
        }
    }

    let timeLeft = timeLimit;
    const timeLeftElem = document.getElementById('time-left');
    if (timeLeftElem) timeLeftElem.innerText = timeLeft;
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeftElem) timeLeftElem.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            for (let i = 0; i < 4; i++) {
                const btn = document.getElementById(`opt-${i}`);
                if (btn) btn.disabled = true;
            }
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.style.color = '#e74c3c';
                feedback.innerText = 'انتهى الوقت!';
            }
        }
    }, 1000);
});

function chooseOption(index) {
    const selectedAnswer = currentOptions[index];
    
    for (let i = 0; i < 4; i++) {
        const btn = document.getElementById(`opt-${i}`);
        if (btn) btn.disabled = true;
    }

    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.style.color = '#f39c12';
        feedback.innerText = 'تم إرسال إجابتك، بانتظار باقي اللاعبين...';
    }

    socket.emit('submitAnswer', { roomCode: myRoomCode, selectedAnswer });
}

socket.on('answerResult', ({ correct }) => {
    const feedback = document.getElementById('feedback');
    if (!feedback) return;
    if (!correct) {
        feedback.style.color = '#e74c3c';
        feedback.innerText = 'إجابة خاطئة! بانتظار انتهاء الوقت أو إجابة البقية...';
    } else {
        feedback.style.color = '#27ae60';
        feedback.innerText = 'إجابة صحيحة! بانتظار انتهاء الوقت أو إجابة البقية...';
    }
});

socket.on('updateScoreboardOnly', ({ players }) => {
    const scoreboard = document.getElementById('scoreboard');
    if (!scoreboard) return;
    scoreboard.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `👤 <b>${p.name}</b> ➔ النقاط: <span style="color: #e67e22;">${p.score}</span> | ✅ صحيحة: <span style="color: #27ae60;">${p.correctCount}</span> | ❌ خاطئة: <span style="color: #e74c3c;">${p.wrongCount}</span>`;
        scoreboard.appendChild(li);
    });
});

socket.on('correctAnswerAnnouncement', ({ surah, fullAyah, players }) => {
    clearInterval(timerInterval);
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = `📖 <b>سورة ${surah}</b> - الإجابة الصحيحة: <span style="color: #2980b9;">${fullAyah}</span>`;
    }

    const scoreboard = document.getElementById('scoreboard');
    if (!scoreboard) return;
    scoreboard.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `👤 <b>${p.name}</b> ➔ النقاط: <span style="color: #e67e22;">${p.score}</span> | ✅ صحيحة: <span style="color: #27ae60;">${p.correctCount}</span> | ❌ خاطئة: <span style="color: #e74c3c;">${p.wrongCount}</span>`;
        scoreboard.appendChild(li);
    });
});

socket.on('gameOver', ({ players }) => {
    clearInterval(timerInterval);
    const gameScreen = document.getElementById('game-screen');
    
    const myPlayer = players.find(p => p.id === socket.id) || players[0];
    
    let historyHtml = '<h4>📋 مراجعة إجاباتك الشخصية:</h4><ul style="max-height: 220px; overflow-y: auto; text-align: right;">';
    if (myPlayer && myPlayer.answerHistory && myPlayer.answerHistory.length > 0) {
        myPlayer.answerHistory.forEach((ans, index) => {
            const statusIcon = ans.isCorrect ? '✅' : '❌';
            const colorStyle = ans.isCorrect ? '#27ae60' : '#e74c3c';
            historyHtml += `<li>
                <b>س${index+1}:</b> ${ans.question} (سورة ${ans.surah})<br>
                إجابتك: <span style="color: ${colorStyle}; font-weight: bold;">${ans.selectedAnswer} ${statusIcon}</span>
                ${!ans.isCorrect ? `<br>💡 الإجابة الصحيحة: <span style="color: #27ae60; font-weight: bold;">${ans.correctAnswer}</span>` : ''}
            </li>`;
        });
    } else {
        historyHtml += '<li>لم تقم بالإجابة على الأسئلة.</li>';
    }
    historyHtml += '</ul>';

    gameScreen.innerHTML = `
        <h2>🏆 انتهت المسابقة!</h2>
        <h3>لوحة النتائج النهائية:</h3>
        <ul id="final-scoreboard" style="margin: 10px 0;"></ul>
        ${historyHtml}
        <button class="main-btn" onclick="restartGameSameSettings()">🔄 إعادة اللعب مع الصديق (نفس الإعدادات)</button>
        <button class="secondary-btn" onclick="goToSettingsScreen()">⚙️ تغيير الإعدادات والصعوبة</button>
    `;
    
    const ul = document.getElementById('final-scoreboard');
    if (ul) {
        players.sort((a, b) => b.score - a.score).forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `👤 <b>${p.name}</b> ➔ المجموع: <span style="color: #e67e22;">${p.score} نقطة</span> | ✅ ${p.correctCount} | ❌ ${p.wrongCount}`;
            ul.appendChild(li);
        });
    }
});

function restartGameSameSettings() {
    socket.emit('restartGame', { roomCode: myRoomCode });
}

function goToSettingsScreen() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('create-room-screen').classList.remove('hidden');
}
