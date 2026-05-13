document.addEventListener('DOMContentLoaded', function () 
{
    // Елементи пошуку та фільтрації за статусом
    const searchInput = document.getElementById('bookingSearch');
    const statusFilter = document.getElementById('statusFilter');

    // Функція фільтрації рядків таблиці
    function filterTable() 
    {
        let searchText = searchInput ? searchInput.value.toLowerCase() : "";
        let statusValue = statusFilter ? statusFilter.value : "";
        let table = document.getElementById("bookingsTable");
        if (!table) return;

        let rows = table.querySelector("tbody").rows;

        for (let i = 0; i < rows.length; i++) 
        {
            // Отримання текстових даних з комірок клієнта, туру та статусу
            let clientName = rows[i].cells[1].textContent.toLowerCase();
            let tourName = rows[i].cells[2].textContent.toLowerCase();
            let statusText = rows[i].cells[6].textContent.trim();

            // Перевірка на відповідність пошуковому запиту та обраному статусу
            let matchesSearch = tourName.includes(searchText) || clientName.includes(searchText);
            let matchesStatus = statusValue === "" || statusText === statusValue;

            // Відображення або приховування рядка залежно від результату
            rows[i].style.display = (matchesSearch && matchesStatus) ? "" : "none";
        }
    }

    // Слухачі подій для введення тексту та зміни фільтра
    if (searchInput) searchInput.addEventListener('keyup', filterTable);
    if (statusFilter) statusFilter.addEventListener('change', filterTable);

    // Логіка роботи кнопок редагування бронювання
    const editButtons = document.querySelectorAll('.btn-admin-text-edit');
    editButtons.forEach(button => 
    {
        button.addEventListener('click', function () 
        {
            // Отримання даних з атрибутів кнопки
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const phone = this.getAttribute('data-phone');
            const email = this.getAttribute('data-email');
            const tour = this.getAttribute('data-tour');
            const status = this.getAttribute('data-status');
            const comment = this.getAttribute('data-comment');

            // Заповнення текстових полів у модальному вікні
            document.getElementById('modalBookingIdTitle').innerText = id;
            document.getElementById('modalTourName').innerText = tour;
            document.getElementById('modalClientName').innerText = name;
            document.getElementById('modalClientPhone').innerText = phone;
            document.getElementById('modalClientEmail').innerText = email;
            document.getElementById('modalClientComment').innerText = comment;

            const statusSelect = document.getElementById('modalStatusSelect');
            const saveButton = document.querySelector('#editBookingForm .save');

            // Встановлення поточного статусу та оновлення адреси форми
            statusSelect.value = status;
            document.getElementById('editBookingForm').action = "/admin/update_booking_status/" + id;

            // Блокування змін, якщо бронювання вже має статус оплачено
            if (status === 'Оплачено') 
            {
                statusSelect.disabled = true; // Вимкнення випадаючого списку
                if (saveButton) saveButton.style.display = 'none'; // Приховування кнопки збереження
            } else 
            {
                statusSelect.disabled = false; // Дозволення редагування для інших статусів
                if (saveButton) saveButton.style.display = 'inline-block'; // Показ кнопки збереження
            }

            // Відкриття модального вікна через зміну стилю відображення
            document.getElementById('editBookingModal').style.display = 'flex';
        });
    });
});

// Відкриття модального вікна для підтвердження видалення
function openDeleteBookingModal(id, tourName) 
{
    const modal = document.getElementById('deleteBookingModal');
    const form = document.getElementById('deleteBookingForm');
    const title = document.getElementById('deleteTourName');

    if (modal && form && title) 
    {
        title.innerText = tourName;
        form.action = "/admin/delete_booking/" + id; 
        modal.style.display = 'flex';
    }
}

// Функція для закриття модального вікна редагування
function closeEditBookingModal() 
{
    document.getElementById('editBookingModal').style.display = 'none';
}

// Функція для закриття модального вікна видалення
function closeDeleteBookingModal() 
{
    document.getElementById('deleteBookingModal').style.display = 'none';
}

// Закриття будь-якого модального вікна при кліку на затемнену область фону
window.onclick = function (event) 
{
    const editModal = document.getElementById('editBookingModal');
    const deleteModal = document.getElementById('deleteBookingModal');

    if (event.target == editModal) closeEditBookingModal();
    if (event.target == deleteModal) closeDeleteBookingModal();
}

// Універсальна функція для сортування таблиці за стовпцями
function sortTable(n) 
{
    let table = document.getElementById("bookingsTable");
    let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    dir = "asc";

    while (switching) 
    {
        switching = false;
        rows = table.rows;

        for (i = 1; i < (rows.length - 1); i++) 
        {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];

            let xContent = x.textContent.trim();
            let yContent = y.textContent.trim();

            let xValue, yValue;
            
            // Спеціальна обробка для стовпця з датами
            if (n === 3) { 
                const partsX = xContent.split('.');
                const partsY = yContent.split('.');
                xValue = new Date(partsX[2], partsX[1] - 1, partsX[0]);
                yValue = new Date(partsY[2], partsY[1] - 1, partsY[0]);
            } else {
                // Очищення тексту від зайвих символів для числового порівняння
                let xRaw = xContent.replace('#', '').replace(' грн', '').replace(',', '.');
                let yRaw = yContent.replace('#', '').replace(' грн', '').replace(',', '.');
                xValue = isNaN(parseFloat(xRaw)) ? xRaw.toLowerCase() : parseFloat(xRaw);
                yValue = isNaN(parseFloat(yRaw)) ? yRaw.toLowerCase() : parseFloat(yRaw);
            }

            // Порівняння значень залежно від обраного напрямку
            if (dir == "asc") {
                if (xValue > yValue) { shouldSwitch = true; break; }
            } else if (dir == "desc") {
                if (xValue < yValue) { shouldSwitch = true; break; }
            }
        }

        if (shouldSwitch) {
            // Перестановка рядків місцями
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            // Зміна напрямку сортування на протилежний при повторному натисканні
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}