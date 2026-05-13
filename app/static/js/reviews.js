document.addEventListener('DOMContentLoaded', function () {
    // Налаштування інтерактивних зірок для основної форми додавання відгуку
    const stars = document.querySelectorAll('#starRating .star');
    const ratingInput = document.getElementById('ratingValue');

    stars.forEach(star => {
        // Підсвічування при наведенні курсору
        star.addEventListener('mouseover', () => highlightStars(stars, star.getAttribute('data-value')));
        // Повернення до збереженого значення, коли курсор іде геть
        star.addEventListener('mouseout', () => highlightStars(stars, ratingInput.value));
        // Фіксація обраного рейтингу при кліку
        star.addEventListener('click', function () {
            const value = this.getAttribute('data-value');
            ratingInput.value = value;
            highlightStars(stars, value);
        });
    });

    // Налаштування системи оцінювання всередині модального вікна редагування
    const modalStars = document.querySelectorAll('.modal-star');
    const modalRatingInput = document.getElementById('modalRatingValue');

    modalStars.forEach(star => {
        star.addEventListener('mouseover', () => highlightStars(modalStars, star.getAttribute('data-value')));
        star.addEventListener('mouseout', () => highlightStars(modalStars, modalRatingInput.value));
        star.addEventListener('click', function () {
            const value = this.getAttribute('data-value');
            modalRatingInput.value = value;
            highlightStars(modalStars, value);
        });
    });

    // Допоміжна функція для візуального відображення активних зірок
    function highlightStars(starElements, value) {
        starElements.forEach(s => {
            // Додавання класу активності для всіх зірок до обраного значення включно
            if (parseInt(s.getAttribute('data-value')) <= parseInt(value || 0)) {
                s.classList.add('selected');
            } else {
                s.classList.remove('selected');
            }
        });
    }

    // Перевірка основної форми перед відправкою
    const mainForm = document.getElementById('mainReviewForm');
    if (mainForm) {
        mainForm.addEventListener('submit', function (e) {
            const rating = document.getElementById('ratingValue').value;
            if (parseInt(rating) === 0) {
                e.preventDefault(); // Скасовуємо відправку форми
                alert('Будь ласка, поставте хоча б одну зірку!');
            }
        });
    }

    // Перевірка форми в модальному вікні
    const editForm = document.getElementById('editReviewForm');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            const modalRating = document.getElementById('modalRatingValue').value;
            if (parseInt(modalRating) === 0) {
                e.preventDefault(); // Скасовуємо відправку форми
                alert('Рейтинг не може бути нульовим!');
            }
        });
    }

    // Управління модальним вікном для зміни існуючих відгуків
    window.openEditModal = function (id, tourTitle, rating, text) {
        const modal = document.getElementById('editReviewModal');
        const form = document.getElementById('editReviewForm');
        // Наповнення полів вікна поточною інформацією про тур та відгук
        document.getElementById('modalTourName').innerText = tourTitle;
        document.getElementById('modalReviewText').value = text;
        document.getElementById('modalRatingValue').value = rating;

        // Динамічне формування маршруту для відправки запиту на сервер
        form.action = '/edit_review/' + id;

        // Візуалізація поточної оцінки через підсвічування зірок
        highlightStars(modalStars, rating);

        modal.style.display = 'flex';
    };

    // Закриття вікна редагування
    window.closeEditModal = function () {
        document.getElementById('editReviewModal').style.display = 'none';
    };

    // Підготовка даних перед відкриттям вікна (збір атрибутів із кнопки)
    window.prepareEditModal = function (button) {
        const id = button.getAttribute('data-id');
        const title = button.getAttribute('data-title'); 
        const rating = button.getAttribute('data-rating');
        const text = button.getAttribute('data-text');

        openEditModal(id, title, rating, text);
    };

    // Автоматичне закриття модального вікна при кліку за межами його контенту
    window.onclick = function (event) {
        const modal = document.getElementById('editReviewModal');
        if (event.target == modal) {
            closeEditModal();
        }
    };
});