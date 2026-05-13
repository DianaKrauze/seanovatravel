// Ініціалізація WebSocket з’єднання та отримання ID поточного користувача
const socket = io();
const currentUserId = document.getElementById('current-user-id').value;
let currentActiveManagerId = null;

// Функція для перемикання між чатами з менеджерами
function openManagerChat(managerId, managerName) {
    currentActiveManagerId = managerId;
    
    // Візуальне перемикання інтерфейсу з заглушки на активне вікно чату
    document.getElementById('noChatSelected').style.display = 'none';
    document.getElementById('activeChat').style.display = 'flex';
    document.getElementById('activeManagerName').innerText = managerName;
    
    // Оновлення активного стану в списку менеджерів (підсвітка вибору)
    document.querySelectorAll('.manager-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Завантаження історії повідомлень для обраного діалогу
    fetchMessages(managerId);
}

// Завантаження архіву повідомлень через API
function fetchMessages(managerId) {
    fetch(`/get_messages/${managerId}`)
        .then(response => response.json())
        .then(messages => {
            const display = document.getElementById('messagesDisplay');
            display.innerHTML = '';
            // Визначення типу повідомлення (відправлене/отримане) та його рендеринг
            messages.forEach(msg => {
                const type = msg.sender_id == currentUserId ? 'sent' : 'received';
                appendMessage(msg.text, type, msg.time, msg.file_path);
            });
        });
}

// Обробка відправки текстового повідомлення через форму
document.getElementById('chatForm').onsubmit = function(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    // Відправка події через сокети, якщо поле не порожнє та обрано отримувача
    if (text && currentActiveManagerId) {
        socket.emit('send_message', {
            'text': text,
            'receiver_id': currentActiveManagerId
        });
        input.value = '';
    }
};

// Прослуховування вхідних повідомлень у реальному часі
socket.on('new_message', function(data) {
    // Відображення повідомлення тільки якщо воно стосується активного діалогу
    if (data.sender_id == currentActiveManagerId || data.sender_id == currentUserId) {
        const type = data.sender_id == currentUserId ? 'sent' : 'received';
        appendMessage(data.text, type, data.time, data.file_path);
    }
});

// Оновлення індикаторів мережевого статусу користувачів
socket.on('status_change', function(data) {
    const dot = document.getElementById(`status-${data.user_id}`);
    const text = document.getElementById(`status-text-${data.user_id}`);
    if (dot) {
        dot.className = `status-dot ${data.status}`;
        if (text) text.innerText = data.status === 'online' ? 'В мережі' : 'Не в мережі';
    }
});

// Додавання нового елемента повідомлення у вікно чату
function appendMessage(text, type, time, filePath = null) {
    const display = document.getElementById('messagesDisplay');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    
    let content = text;
    
    // Формування HTML-структури для повідомлень, що містять файли
    if (filePath) {
        const fileUrl = `/static/uploads/chat/${filePath}`;
        content = `
            <div class="file-message">
                <img src="/static/images/attach.png" style="width: 15px; margin-right: 5px; filter: grayscale(1);">
                <a href="${fileUrl}" target="_blank" style="color: inherit; text-decoration: underline;">
                    ${text}
                </a>
            </div>`;
    }
    
    // Додавання контенту та мітки часу
    msgDiv.innerHTML = `${content}<span class="message-time">${time}</span>`;
    display.appendChild(msgDiv);

    // Автоматична прокрутка до останнього повідомлення
    display.scrollTop = display.scrollHeight;
}

// Обробка миттєвого завантаження файлу при його виборі
document.getElementById('chatFileInput').onchange = function() {
    const file = this.files[0];
    if (!file || !currentActiveManagerId) return;

    // Підготовка даних форми для відправки файлу на сервер
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver_id', currentActiveManagerId);

    fetch('/upload_chat_file', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Файл успішно завантажено");
            this.value = ''; 
        } else {
            alert("Помилка завантаження: " + data.error);
        }
    });
};