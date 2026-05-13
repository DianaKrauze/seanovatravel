// Ініціалізація з'єднання через сокети та отримання id поточного користувача
const socket = io();
const currentUserId = document.getElementById('current-user-id').value;
let currentActiveUserId = null;

// Відкриття вікна чату з конкретним користувачем
function openChat(userId, userName) {
    currentActiveUserId = userId;
    
    // Перемикання відображення блоків інтерфейсу чату
    document.getElementById('noChatSelected').style.display = 'none';
    document.getElementById('activeChat').style.display = 'flex';
    document.getElementById('activeUserName').innerText = userName;
    
    // Виділення активного контакту в списку ліворуч
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    const selectedEl = document.getElementById(`contact-${userId}`);
    if (selectedEl) selectedEl.classList.add('active');

    // Запит історії листування з сервера
    fetchMessages(userId);
}

// Завантаження історії повідомлень з бази даних
function fetchMessages(userId) {
    fetch(`/get_messages/${userId}`)
        .then(response => response.json())
        .then(messages => {
            const display = document.getElementById('messagesDisplay');
            display.innerHTML = '';
            // Визначення типу повідомлення та його виведення на екран
            messages.forEach(msg => {
                const type = msg.sender_id == currentUserId ? 'sent' : 'received';
                appendMessage(msg, type, msg.time);
            });
        })
        .catch(err => console.error("Помилка завантаження повідомлень:", err));
}

// Відправка текстового повідомлення через форму
document.getElementById('chatForm').onsubmit = function(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    // Передача даних через сокет, якщо є текст та обраний отримувач
    if (text && currentActiveUserId) {
        socket.emit('send_message', {
            'text': text,
            'receiver_id': currentActiveUserId
        });
        input.value = '';
    }
    return false;
};

// Обробка нових повідомлень, що надходять у реальному часі
socket.on('new_message', function(data) {
    const isFromActiveUser = (data.sender_id == currentActiveUserId);
    const isToActiveUser = (data.receiver_id == currentActiveUserId && data.sender_id == currentUserId);

    // Додавання повідомлення у вікно, якщо чат з цим користувачем зараз відкритий
    if (isFromActiveUser || isToActiveUser) {
        const type = data.sender_id == currentUserId ? 'sent' : 'received';
        appendMessage(data, type, data.time);
    } else {
        // Позначення контакту як непрочитаного, якщо чат з ним закритий
        const contact = document.getElementById(`contact-${data.sender_id}`);
        if (contact) contact.classList.add('unread');
    }
});

// Обробка вибору файлу для відправки
function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    // Перевірка розміру файлу перед завантаженням
    if (file.size > 10 * 1024 * 1024) {
        alert("Файл занадто великий! Максимум 10МБ.");
        input.value = '';
        return;
    }

    uploadFile(file);
}

// Завантаження файлу на сервер через post запит
function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver_id', currentActiveUserId);

    // Візуальна індикація початку завантаження
    const attachBtnImg = document.querySelector('.btn-attach img');
    if (attachBtnImg) attachBtnImg.style.opacity = '0.5';

    fetch('/upload_chat_file', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Помилка сервера');
        return response.json();
    })
    .then(data => {
        // Повернення іконки до нормального стану та очищення поля вибору
        if (attachBtnImg) attachBtnImg.style.opacity = '1';
        if (data.success) {
            document.getElementById('fileInput').value = '';
        } else {
            alert("Помилка: " + (data.error || "Невідома помилка"));
        }
    })
    .catch(error => {
        if (attachBtnImg) attachBtnImg.style.opacity = '1';
        console.error('Error:', error);
        alert("Помилка завантаження. Перевірте консоль сервера.");
    });
}

// Функція для створення html елемента повідомлення та додавання його в чат
function appendMessage(data, type, time) {
    const display = document.getElementById('messagesDisplay');
    if (!display) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;

    // Формування вмісту повідомлення залежно від того, чи це файл, чи текст
    if (data.file_path) {
        msgDiv.innerHTML = `
            <div class="file-attachment">
                <img src="/static/images/attach.png" style="width: 16px; height: 16px; vertical-align: middle;">
                <a href="/static/uploads/chat/${data.file_path}" target="_blank" style="margin-left: 5px;">
                    ${data.text}
                </a>
            </div>
            <span class="message-time">${time}</span>`;
    } else {
        
        msgDiv.innerHTML = `<div>${data.text}</div><span class="message-time">${time}</span>`;
    }

    // Додавання елемента та автоматична прокрутка вниз
    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

// Логіка швидкого пошуку клієнта у списку контактів
document.getElementById('contactSearch').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const contacts = document.querySelectorAll('.contact-item');

    contacts.forEach(contact => {
        
        const contactName = contact.querySelector('.contact-name').innerText.toLowerCase();
        
        // Відображення лише тих контактів, чиє ім'я містить пошуковий запит
        if (contactName.includes(searchTerm)) {
            contact.style.display = 'flex'; 
        } else {
            contact.style.display = 'none'; 
        }
    });
});