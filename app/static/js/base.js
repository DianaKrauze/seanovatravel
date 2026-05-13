// Пошук елементів для перемикання теми на сторінці
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('.icon-img');

// Функція для зміни теми та збереження вибору користувача
function setTheme(theme) {
    // Встановлення атрибута для коректного відображення стилів css
    document.documentElement.setAttribute('data-theme', theme);
    // Збереження обраної теми у локальному сховищі браузера
    localStorage.setItem('theme', theme);
    
    // Оновлення іконки та альтернативного тексту залежно від обраної теми
    if (theme === 'dark') {
        themeIcon.src = "/static/images/moon.png"; 
        themeIcon.alt = "Темна тема";
    } else {
        themeIcon.src = "/static/images/sun.png";
        themeIcon.alt = "Світла тема";
    }
}

// Завантаження збереженої теми або встановлення світлої за замовчуванням
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

// Обробка кліку на кнопку перемикача для зміни поточної теми
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});


// Автоматичне приховування сповіщень через чотири секунди після появи
setTimeout(function () {
    const flashes = document.querySelectorAll('.flash-message');
    flashes.forEach(msg => {
        // Плавне зникнення через зміну прозорості
        msg.style.transition = "opacity 0.5s ease";
        msg.style.opacity = "0";
        // Повне видалення елемента з коду сторінки після завершення анімації
        setTimeout(() => msg.remove(), 500); 
    });
}, 4000);

