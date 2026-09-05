const socket = io("accurate-courage-production-8e3e.up.railway.app");

const loginBox = document.getElementById('login-box');
const menuBox = document.getElementById('menu-box');
const gameBox = document.getElementById('game-box');
const quizBox = document.getElementById('quiz-box');

const playerNameInput = document.getElementById('playerName');
const loginBtn = document.getElementById('login-btn');
const categorySelect = document.getElementById('categorySelect');
const difficultySelect = document.getElementById('difficultySelect');
const maxPlayersInput = document.getElementById('maxPlayers');
const roomCodeInput = document.getElementById('roomCodeInput');
const playersList = document.getElementById('players-list');
const displayCode = document.getElementById('display-code');
const startGameBtn = document.getElementById('start-game-btn');
const waitingMsg = document.getElementById('waiting-msg');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const scoreDisplay = document.getElementById('score-display');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackText = document.getElementById('feedback-text');
const backToHomeBtn = document.getElementById('back-to-home-btn');

let currentRoom = '';
let playerName = '';

loginBtn.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('الرجاء إدخال اسمك أولاً للدخول!');
        return;
    }
    loginBox.classList.add('hidden');
    menuBox.classList.remove('hidden');
});

document.getElementById('create-btn').addEventListener('click', () => {
    const maxPlayers = maxPlayersInput.value;
    const category = categorySelect.value;
    const difficulty = difficultySelect.value;

    socket.emit('create-room', { playerName, maxPlayers, category, difficulty });
});

document.getElementById('join-btn').addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) return alert('الرجاء إدخال رمز الغرفة!');
    socket.emit('join-room', { playerName, roomCode });
});

socket.on('room-created', ({ roomCode, players }) => {
    currentRoom = roomCode;
    showGameRoom(roomCode, players);
    startGameBtn.classList.remove('hidden');
    waitingMsg.classList.add('hidden');
});

socket.on('room-joined', ({ roomCode, players }) => {
    currentRoom = roomCode;
    showGameRoom(roomCode, players);
    startGameBtn.classList.add('hidden');
    waitingMsg.classList.remove('hidden');
});

socket.on('error-msg', (msg) => alert(msg));

function showGameRoom(roomCode, players) {
    menuBox.classList.add('hidden');
    gameBox.classList.remove('hidden');
    displayCode.textContent = roomCode;
    updatePlayersUI(players);
}

startGameBtn.addEventListener('click', () => {
    if (currentRoom) {
        socket.emit('start-game', currentRoom);
    }
});

socket.on('game-started', () => {
    gameBox.classList.add('hidden');
    quizBox.classList.remove('hidden');
});

socket.on('new-question', ({ question, options, questionIndex, total }) => {
    feedbackContainer.classList.add('hidden');
    questionText.style.display = 'block';
    optionsContainer.style.display = 'block';

    questionText.textContent = `السؤال (${questionIndex + 1}/${total}): ${question}`;
    optionsContainer.innerHTML = '';

    options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.className = 'option-btn';
        btn.addEventListener('click', () => {
            const allBtns = optionsContainer.querySelectorAll('button');
            allBtns.forEach(b => b.disabled = true);

            socket.emit('submit-answer', {
                roomCode: currentRoom,
                answerIndex: index
            });
        });
        optionsContainer.appendChild(btn);
    });
});

socket.on('waiting-for-others', ({ isCorrect, pointsEarned, correctAnswerText }) => {
    questionText.style.display = 'none';
    optionsContainer.style.display = 'none';
    feedbackContainer.classList.remove('hidden');

    if (isCorrect) {
        feedbackText.textContent = `إجابة صحيحة! 🎉 (+${pointsEarned} نقطة)`;
        feedbackText.className = 'feedback correct';
    } else {
        feedbackText.textContent = `إجابة خاطئة! ❌ (${pointsEarned} نقطة) | الإجابة الصحيحة: ${correctAnswerText}`;
        feedbackText.className = 'feedback wrong';
    }
});

socket.on('update-players', (players) => {
    updatePlayersUI(players);
});

function updatePlayersUI(players) {
    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `👤 ${p.name} - المجموع: ${p.score}`;
        playersList.appendChild(li);
    });
    
    const me = players.find(p => p.id === socket.id);
    if (me) {
        scoreDisplay.textContent = `المجموع الكلي: ${me.score}`;
    }
}

socket.on('game-over', (players) => {
    let resultsHTML = `<h2>انتهت المسابقة! 🏆</h2>`;
    let scoresHTML = '<h3>النتائج النهائية:</h3><ul style="list-style:none; padding:0;">';
    players.sort((a, b) => b.score - a.score);
    players.forEach((p, idx) => {
        scoresHTML += `<li>${idx + 1}. 👤 ${p.name} - المجموع: ${p.score}</li>`;
    });
    scoresHTML += '</ul>';
    
    document.getElementById('question-container').innerHTML = resultsHTML + scoresHTML;
    feedbackContainer.classList.add('hidden');
    backToHomeBtn.classList.remove('hidden');
});
