// Відкриття модального вікна для підтвердження скасування
function openCancelModal(button) {
    // Витягнення даних з кнопок через data-атрибути
    const bookingId = button.getAttribute('data-booking-id');
    const actionUrl = button.getAttribute('data-url');
    const modal = document.getElementById('cancelModal');
    const form = document.getElementById('confirmCancelForm');
    const idSpan = document.getElementById('modalBookingId');

    // Наповнення модалки контекстними даними
    idSpan.innerText = '№' + bookingId;
    form.action = actionUrl;

    // Відображення вікна за допомогою flex-контейнера
    modal.style.display = 'flex';
}

// Функція для приховування вікна скасування
function closeModal() {
    document.getElementById('cancelModal').style.display = 'none';
}

// Глобальний обробник для закриття вікна при кліку на фон
window.onclick = function (event) {
    const modal = document.getElementById('cancelModal');
    if (event.target == modal) {
        closeModal();
    }
}

// Логіка оплати та обробки банківських карток
document.addEventListener('DOMContentLoaded', function () {
    const paymentForm = document.getElementById('fake-payment-form');
    const cardNumber = document.getElementById('card-number');
    const cardExpiry = document.getElementById('card-expiry');
    const cardCVV = document.getElementById('card-cvv');

    // Налаштування Bootstrap компонентів для модальних вікон
    const paymentModalElem = document.getElementById('paymentModal');
    const successModalElem = document.getElementById('successModal');
    const paymentModal = paymentModalElem ? new bootstrap.Modal(paymentModalElem) : null;
    const successModal = successModalElem ? new bootstrap.Modal(successModalElem) : null;

    // Глобальна функція для ініціалізації процесу оплати конкретного бронювання
    window.openPaymentModal = function (bookingId) {
        const idInput = document.getElementById('current-booking-id');
        if (idInput) idInput.value = bookingId;
        if (paymentModal) paymentModal.show();
    };

    // Форматування номера картки: розділення на блоки по 4 цифри
    if (cardNumber) {
        cardNumber.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = "";
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) formattedValue += " ";
                formattedValue += value[i];
            }
            e.target.value = formattedValue.substring(0, 19);
        });
    }

    // Валідація та автоматичне додавання слеша для терміну дії картки
    if (cardExpiry) {
        cardExpiry.addEventListener('input', function (e) {
            let value = e.target.value.replace(/[^0-9]/gi, '');
            if (value.length >= 2) {
                let month = parseInt(value.substring(0, 2));
                // Обмеження значень місяців у межах реального календаря
                if (month > 12) month = 12;
                if (month === 0 && value.length >= 2) month = 1;

                let formattedMonth = month.toString().padStart(2, '0');
                e.target.value = formattedMonth + '/' + value.substring(2, 4);
            } else {
                e.target.value = value;
            }
        });

        // Забезпечення коректної роботи клавіші видалення для форматованого поля
        cardExpiry.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && e.target.value.length === 3) {
                e.target.value = e.target.value.substring(0, 2);
            }
        });
    }

    // Обмеження вводу секретного коду CVV трьома цифрами
    if (cardCVV) {
        cardCVV.addEventListener('input', function (e) {
            e.target.value = e.target.value.replace(/[^0-9]/gi, '').substring(0, 3);
        });
    }

    // Обробка відправки даних оплати на сервер через асинхронний запит
    if (paymentForm) {
        paymentForm.onsubmit = function (e) {
            e.preventDefault();
            const bookingId = document.getElementById('current-booking-id').value;

            // Зчитуємо введене значення картки (наприклад, "4111 1111 1111 1111")
            const rawCardNumber = cardNumber ? cardNumber.value : "";

            // Запобігання повторним транзакціям під час обробки
            const submitBtn = paymentForm.querySelector('[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            fetch(`/pay_booking/${bookingId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // ОБОВ'ЯЗКОВО ДОДАЄМО ТІЛО ЗАПИТУ:
                body: JSON.stringify({
                    card_number: rawCardNumber
                })
            }).then(response => {
                if (response.ok) {
                    // Перемикання модальних вікон при успішній оплаті
                    if (paymentModal) paymentModal.hide();
                    if (successModal) successModal.show();

                    // Перезавантаження сторінки для оновлення статусів у кабінеті
                    setTimeout(() => {
                        window.location.reload();
                    }, 2500);
                } else {
                    alert("Помилка при оплаті. Спробуйте пізніше.");
                    if (submitBtn) submitBtn.disabled = false;
                }
            }).catch(error => {
                console.error('Error:', error);
                if (submitBtn) submitBtn.disabled = false;
            });
        };
    }
    });

    // Перевірка часу для автоматичного переведення бронювань у статус до оплати
    function checkBookingTimers() {
        const triggers = document.querySelectorAll('.timer-trigger');
        const now = new Date();

        triggers.forEach(trigger => {
            const bookingId = trigger.getAttribute('data-booking-id');
            const updatedTimeStr = trigger.getAttribute('data-updated');
            const updatedTime = new Date(updatedTimeStr);
            const diff = now - updatedTime;

            // Якщо пройшло 15 секунд і статус ще не було оновлено 
            if (diff >= 15000) {
                fetch(`/booking/update_to_pay/${bookingId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }).then(response => {
                    if (response.ok) {

                        showSuccessFlash("Ваше замовлення підтверджено менеджером! Тепер ви можете його оплатити.");


                        trigger.classList.remove('timer-trigger');


                        setTimeout(() => {
                            window.location.reload();
                        }, 3000);
                    }
                });
            }
        });
    }

    // Функція для створення візуального повідомлення
    function showSuccessFlash(text) {
        const container = document.getElementById('js-flash-container');
        const message = document.createElement('div');
        message.className = 'flash-message success-status-update';
        message.innerText = text;

        container.appendChild(message);

    }

    setInterval(checkBookingTimers, 1000); 
