document.addEventListener('DOMContentLoaded', function() {
    // Отримання посилань на елементи форми та блоки відображення результатів
    const peopleInput = document.getElementById('people-input');
    const basePriceInput = document.getElementById('base-price');
    const resPeopleCount = document.getElementById('res-people-count');
    const resTotalPrice = document.getElementById('res-total-price');
    const phoneInput = document.getElementById('phone-input');
    const bookingForm = document.getElementById('booking-form');

    // Перевірка наявності критично важливих елементів перед початком роботи скрипта
    if (!basePriceInput || !peopleInput) return;

    // Збереження базової ціни за одну особу
    const basePrice = parseFloat(basePriceInput.value);

    // Функція для автоматичного перерахунку загальної вартості туру
    function updatePrice() {
        let count = parseInt(peopleInput.value);
        
        // Перевірка на некоректне введення кількості осіб (мінімум одна особа)
        if (isNaN(count) || count < 1) {
            count = 1;
        }

        // Обчислення фінальної суми
        const total = count * basePrice;
        
        // Оновлення текстових даних у блоці попереднього розрахунку
        if (resPeopleCount) resPeopleCount.innerText = count;
        if (resTotalPrice) resTotalPrice.innerText = total.toFixed(1) + ' грн';
    }

    // Відстеження змін у полі кількості осіб для миттєвого оновлення ціни
    peopleInput.addEventListener('input', updatePrice);
    peopleInput.addEventListener('change', updatePrice);

    // Реалізація спрощеної маски для автоматичного додавання коду країни +38
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Видалення всіх символів, крім цифр та знака плюс
            let value = e.target.value.replace(/[^\d+]/g, '');
            // Примусове встановлення початку номера для українських операторів
            if (!value.startsWith('+38')) {
                value = '+38' + value.replace('+38', '');
            }
            e.target.value = value;
        });
    }

    // Перевірка формату номера телефону перед відправкою форми
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            const phoneValue = phoneInput.value;
            // Регулярний вираз для перевірки повної відповідності стандарту +380
            const phonePattern = /^\+380\d{9}$/;

            if (!phonePattern.test(phoneValue)) {
                // Скасування відправки форми та виведення попередження користувачеві
                e.preventDefault();
                alert('Будь ласка, введіть коректний номер телефону (+380XXXXXXXXX)');
                phoneInput.focus();
            }
        });
    }
    
    // Первинний розрахунок вартості одразу після завантаження вмісту сторінки
    updatePrice();
});