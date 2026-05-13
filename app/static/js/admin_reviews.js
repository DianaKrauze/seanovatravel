// Функція для підготовки даних перед відкриттям модального вікна.
function prepareDetails(button) {
    // Отримання даних користувача, туру та локації з атрибутів кнопки
    const user = button.getAttribute('data-user');
    const tour = button.getAttribute('data-tour');
    const location = button.getAttribute('data-location'); 
    const rating = button.getAttribute('data-rating');
    const date = button.getAttribute('data-date');         
    const text = button.getAttribute('data-text');
    
    // Передача зібраних параметрів у функцію для відображення деталей
    showReviewDetails(user, tour, location,rating,date,text);
}

// Відображення модального вікна з повним текстом відгуку
function showReviewDetails(user, tour, location, rating, date, text) {
    // Заповнення текстових полів модального вікна отриманими даними
    document.getElementById('detailUser').innerText = user;
    document.getElementById('detailTour').innerText = tour;
    document.getElementById('detailLocation').innerText = location; 
    document.getElementById('detailDate').innerText = date;         
    document.getElementById('detailText').innerText = text;

    // Робота з візуальним відображенням рейтингу зірками
    const ratingContainer = document.getElementById('detailRating');
    ratingContainer.innerHTML = ''; 

    // Створення п'яти зірок та зафарбовування їх відповідно до оцінки
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('span');
        star.classList.add('star-static');
        if (i < rating) {
            star.classList.add('active');
        }
        star.innerHTML = '&#9733;';
        ratingContainer.appendChild(star);
    }

    // Відображення модального вікна за допомогою змінення стилів
    document.getElementById('detailsModal').style.display = 'flex';
}

// Закриття модального вікна
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// Пошук та фільтрація в таблиці за нікнеймом або назвою туру
function filterReviews() {
    let input = document.getElementById("reviewSearch");
    let filter = input.value.toLowerCase();
    let table = document.getElementById("reviewsTable");
    let tr = table.getElementsByTagName("tr");

    // Перебір рядків таблиці, починаючи з другого, щоб не чіпати шапку
    for (let i = 1; i < tr.length; i++) {
        let tdUser = tr[i].getElementsByTagName("td")[1]; // Стовпець "Користувач"
        let tdTour = tr[i].getElementsByTagName("td")[2]; // Стовпець "Тур"
        
        if (tdUser || tdTour) {
            // Об'єднання тексту імені та туру для пошуку за обома полями одночасно
            let txtValue = (tdUser.textContent || tdUser.innerText) + (tdTour.textContent || tdTour.innerText);
            
            // Порівняння введеного тексту із вмістом рядка
            if (txtValue.toLowerCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                // Приховування рядка, якщо збігу немає
                tr[i].style.display = "none";
            }
        }
    }
}

// Сортування таблиці за обраним стовпцем
function sortReviews(n) {
    let table = document.getElementById("reviewsTable");
    let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    // Встановлення початкового напрямку за зростанням
    dir = "asc"; 
    
    while (switching) {
        switching = false;
        rows = table.rows;
        
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("td")[n];
            y = rows[i + 1].getElementsByTagName("td")[n];
            
            // Переведення тексту в нижній регістр для коректного порівняння
            let xContent = x.innerText.toLowerCase();
            let yContent = y.innerText.toLowerCase();

            // Спеціальна логіка для сортування за числовим id
            if (n === 0) {
                xContent = parseInt(xContent);
                yContent = parseInt(yContent);
            }

            // Порівняння значень відповідно до вибраного напрямку
            if (dir == "asc") {
                if (xContent > yContent) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (xContent < yContent) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        
        if (shouldSwitch) {
            // Перестановка рядків у таблиці
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            // Перемикання напрямку на зворотний, якщо нічого не було відсортовано
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

// Закриття модального вікна при кліку на затемнену область фону
window.onclick = function(event) {
    let modal = document.getElementById('detailsModal');
    if (event.target == modal) {
        closeDetailsModal();
    }
}