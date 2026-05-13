
// Перемикання інтерфейсу профілю в режим редагування нікнейму
function enterEditMode() {
    // Приховування статичного відображення нікнейму та іконку редагування
    document.getElementById('nickname-display').style.display = 'none';

    // Отримання доступу до елементів форми та поля введення
    const form = document.getElementById('nickname-form');
    const input = document.getElementById('nickname-input');

    // Відображення форми за допомогою flex-контейнера
    form.style.display = 'flex';

    // Встановлення фокусу на текстове поле для миттєвого введення
    input.focus();
    // Виділення наявного тексту у полі для зручної повної заміни
    input.select();

    // Обробка натискання клавіш для керування станом форми
    input.onkeydown = function (e) {
        // Скасування редагування та повернення до перегляду при натисканні Escape
        if (e.key === "Escape") {
            document.getElementById('nickname-display').style.display = 'flex';
            form.style.display = 'none';
        }
    };
}
