// Функція для обмеження вибору минулих дат у календарі
function setMinDateForTours() {
    const dateInput = document.querySelector('input[name="departure_date"]');
    if (dateInput) {
        // Встановлення поточної дати як мінімально можливої для вибору
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
}

// Налаштування дати одразу після завантаження сторінки
document.addEventListener('DOMContentLoaded', setMinDateForTours);

// Відкриття модального вікна для створення нового туру
function openTourModal() {
    document.getElementById('modalTitle').innerText = 'Додати тур';
    const form = document.getElementById('tourForm');
    form.action = "/admin/add_tour"; 
    form.reset();
    setMinDateForTours();

    // Скидання ідентифікатора туру для нового запису
    const idInput = document.getElementById('tourIdInput');
    if (idInput) idInput.value = "";

    // Встановлення стандартних значень для перемикачів та послуг
    const defaultTransport = document.querySelector('input[name="transport_type"][value="none"]');
    if (defaultTransport) defaultTransport.checked = true;

    document.getElementById('check_insurance').checked = true;
    document.getElementById('check_transfer').checked = true;
    document.getElementById('check_visa').checked = false;

    // Очищення та приховування попереднього перегляду зображення
    const preview = document.getElementById('imagePreview');
    preview.src = "";
    preview.style.display = 'none';
    
    document.getElementById('tourModal').style.display = 'flex';
}

// Завантаження даних існуючого туру для редагування через серверний запит
function editTour(tourId) {
    fetch(`/admin/get_tour/${tourId}`)
        .then(response => {
            if (!response.ok) throw new Error('Помилка завантаження даних');
            return response.json();
        })
        .then(data => {
            document.getElementById('modalTitle').innerText = 'Редагувати тур';
            const form = document.getElementById('tourForm');
            form.action = `/admin/add_tour`; 

            const idInput = document.getElementById('tourIdInput');
            if (idInput) idInput.value = data.id;

            // Наповнення форми даними, що повернув сервер
            form.title.value = data.title;
            form.country.value = data.country;
            form.city.value = data.city;
            form.price.value = data.price;
            form.duration.value = data.duration;
            form.meal_type.value = data.meal_type;
            form.description.value = data.description;
            form.departure_date.value = data.departure_date;
            form.room_type.value = data.room_type || 'Standard';

            // Налаштування станів чекбоксів для додаткових послуг
            document.getElementById('check_insurance').checked = data.has_insurance;
            document.getElementById('check_transfer').checked = data.has_transfer;
            document.getElementById('check_visa').checked = data.has_visa;

            // Вибір відповідних радіокнопок для транспорту та зірковості
            const transportRadio = form.querySelector(`input[name="transport_type"][value="${data.transport_type}"]`);
            if (transportRadio) transportRadio.checked = true;

            const starRadio = document.getElementById(`star${data.stars}`);
            if (starRadio) starRadio.checked = true;

            // Відображення наявного фото туру, якщо воно існує
            const preview = document.getElementById('imagePreview');
            if (data.image_url) {
                preview.src = data.image_url;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }

            document.getElementById('tourModal').style.display = 'flex';
        })
        .catch(error => alert(error.message));
}

// Закриття вікна редагування та повне скидання полів форми
function closeTourModal() {
    const modal = document.getElementById('tourModal');
    modal.style.display = 'none';
    document.getElementById('tourForm').reset();
}

// Створення візуального прев'ю при завантаженні файлу з комп'ютера
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Підготовка модального вікна для видалення туру
function confirmDeleteTour(tourId, tourTitle) {
    const modal = document.getElementById('deleteTourModal');
    const deleteForm = document.getElementById('deleteTourForm');
    const tourNameDisplay = document.getElementById('deleteTourName');

    tourNameDisplay.textContent = tourTitle;
    deleteForm.action = `/admin/delete_tour/${tourId}`;

    modal.style.display = 'flex';
}

// Закриття вікна підтвердження видалення
function closeDeleteTourModal() {
    const modal = document.getElementById('deleteTourModal');
    if (modal) modal.style.display = 'none';
}

// Сортування таблиці турів за обраним параметром
function sortTableTours(n) {
    let table = document.getElementById("toursTable");
    let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    dir = "asc";

    while (switching) {
        switching = false;
        rows = table.rows;

        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];

            let xVal, yVal;

            // Спеціальна обробка числових значень для стовпця ціни
            if (n === 4) { 
                xVal = parseFloat(x.getAttribute('data-price')) || parseFloat(x.innerText.replace(/[^0-9.]/g, '')) || 0;
                yVal = parseFloat(y.getAttribute('data-price')) || parseFloat(y.innerText.replace(/[^0-9.]/g, '')) || 0;
            } 
            // Перетворення тексту на об'єкт дати для коректного порівняння часу
            else if (n === 3) { 
                const parseDate = (str) => {
                    const parts = str.trim().split('.');
                    if(parts.length < 3) return 0;
                    return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                };
                xVal = parseDate(x.innerText);
                yVal = parseDate(y.innerText);
            } 
            // Звичайне текстове порівняння для інших полів
            else { 
                xVal = x.innerText.toLowerCase().trim();
                yVal = y.innerText.toLowerCase().trim();
            }

            // Логіка зміни порядку елементів залежно від напрямку сортування
            if (dir === "asc") {
                if (typeof xVal === 'string' ? xVal.localeCompare(yVal, 'uk') > 0 : xVal > yVal) {
                    shouldSwitch = true; break;
                }
            } else {
                if (typeof xVal === 'string' ? xVal.localeCompare(yVal, 'uk') < 0 : xVal < yVal) {
                    shouldSwitch = true; break;
                }
            }
        }

        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else if (switchcount == 0 && dir == "asc") {
            dir = "desc";
            switching = true;
        }
    }
}

// Фільтрація списку турів за назвою або країною
function filterTours() {
    let input = document.getElementById("tourSearch");
    let filter = input.value.toLowerCase();
    let table = document.getElementById("toursTable");
    let tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        let tdTitle = tr[i].getElementsByTagName("td")[1];
        let tdCountry = tr[i].getElementsByTagName("td")[2];

        if (tdTitle || tdCountry) {
            let txtValue = (tdTitle.textContent || tdTitle.innerText) + " " + (tdCountry.textContent || tdCountry.innerText);
            // Приховування рядків, що не містять введеного тексту
            tr[i].style.display = txtValue.toLowerCase().includes(filter) ? "" : "none";
        }
    }
}

// Обробка кліку по фону для швидкого закриття будь-якого модального вікна
window.onclick = function (event) {
    const deleteModal = document.getElementById('deleteTourModal');
    const editModal = document.getElementById('tourModal');

    if (event.target == deleteModal) {
        closeDeleteTourModal();
    } else if (event.target == editModal) {
        closeTourModal();
    }
};

// Реалізація механізму завантаження файлу шляхом перетягування у зону dropzone
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('tourImageInput');

if (dropZone) {
    // Скасування стандартної обробки подій браузера для drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // Додавання підсвітки зони при наведенні файлу
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight'), false);
    });

    // Видалення підсвітки після завершення перетягування
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false);
    });

    // Прив'язка отриманого файлу до прихованого поля вводу
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            fileInput.files = files; 
            previewImage(fileInput);  
        }
    });
}