// Функція для переходу в режим редагування нікнейму менеджера
function enterEditMode() {
    const display = document.getElementById('nickname-display');
    const form = document.getElementById('nickname-form');
    const input = document.getElementById('nickname-input');

    if (display && form && input) {
        // Приховування тексту та відображення форми введення
        display.style.display = 'none';
        form.style.display = 'flex';

        // Встановлення фокусу та виділення тексту для швидкої заміни
        input.focus();
        input.select();

        // Обробка натискання клавіш всередині поля введення
        input.onkeydown = function (e) {
            // Повернення до звичайного вигляду при натисканні escape
            if (e.key === "Escape") {
                display.style.display = 'flex';
                form.style.display = 'none';
            }

            // Автоматичне збереження та відправка форми при натисканні enter
            if (e.key === "Enter") {
                form.submit();
            }
        };
    }
}