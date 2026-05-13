// Функція для фільтрації списку користувачів за пошуковим запитом та роллю
function filterUsers() {
    let input = document.getElementById("userSearch").value.toLowerCase();
    let role = document.getElementById("roleFilter").value.toLowerCase();
    let table = document.getElementById("usersTable");
    let tr = table.getElementsByTagName("tr");

    // Перебір рядків таблиці для пошуку збігів
    for (let i = 1; i < tr.length; i++) {
        let tdNick = tr[i].getElementsByTagName("td")[1];
        let tdEmail = tr[i].getElementsByTagName("td")[2];
        let tdRole = tr[i].getElementsByTagName("td")[3];

        if (tdNick && tdEmail && tdRole) {
            // Об'єднання нікнейму та пошти для пошуку в обох полях одночасно
            let txtValue = (tdNick.textContent + tdEmail.textContent).toLowerCase();
            let roleValue = tdRole.textContent.toLowerCase();

            // Перевірка на відповідність введеному тексту та вибраній ролі
            let matchesSearch = txtValue.indexOf(input) > -1;
            let matchesRole = (role === "all" || roleValue === role);

            // Відображення або приховування рядка залежно від результату
            tr[i].style.display = (matchesSearch && matchesRole) ? "" : "none";
        }
    }
}

// Універсальна функція сортування таблиці (за зростанням або спаданням)
function sortTable(n) {
    let table = document.getElementById("usersTable");
    let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    // Початковий напрямок сортування
    dir = "asc";
    while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];

            let xContent = x.innerHTML.toLowerCase();
            let yContent = y.innerHTML.toLowerCase();

            // Спеціальне порівняння для стовпця id як чисел
            if (n === 0) {
                if (dir == "asc") {
                    if (Number(xContent) > Number(yContent)) {
                        shouldSwitch = true;
                        break;
                    }
                } else if (dir == "desc") {
                    if (Number(xContent) < Number(yContent)) {
                        shouldSwitch = true;
                        break;
                    }
                }
            } else {
                // Текстове порівняння для всіх інших колонок
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
        }
        if (shouldSwitch) {
            // Перестановка рядків місцями у разі виявлення неправильного порядку
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            // Зміна напрямку сортування на протилежний після першого повного проходу
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

// Закриття модального вікна редагування/додавання користувача
function closeModal() {
    document.getElementById('userModal').style.display = 'none';
}

// Відкриття модального вікна для створення нового облікового запису
function openAddModal() {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');

    document.getElementById('modalTitle').innerText = "Додати користувача";
    form.action = "/admin/add_user";

    form.reset();

    // Дозвіл на редагування всіх полів для нового користувача
    const inputs = ['modalEmail', 'modalPassword', 'modalNickname'];
    inputs.forEach(id => {
        let el = document.getElementById(id);
        el.readOnly = false; 
        el.classList.remove('readonly-input'); 
    });

    // Пароль є обов'язковим лише при створенні нового користувача
    document.getElementById('modalPassword').required = true;
    modal.style.display = 'flex';
}

// Відкриття вікна для зміни існуючих даних користувача
function editUser(id, nickname, role, email) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');

    document.getElementById('modalTitle').innerText = "Редагування користувача #" + id;
    form.action = "/admin/edit_user/" + id;

    // Наповнення форми поточними даними користувача
    document.getElementById('modalEmail').value = email;
    document.getElementById('modalNickname').value = (nickname === 'None' || nickname === '---') ? '' : nickname;
    document.getElementById('modalRole').value = role;

    // Блокування полів, які не підлягають зміні менеджером (тільки роль)
    const inputs = ['modalEmail', 'modalPassword', 'modalNickname'];
    inputs.forEach(id => {
        let el = document.getElementById(id);
        el.readOnly = true; 
        el.classList.add('readonly-input'); 
    });

    document.getElementById('modalPassword').required = false;
    modal.style.display = 'flex';
}

// Відображення вікна підтвердження перед видаленням користувача
function confirmDelete(userId, userName) {
    const modal = document.getElementById('deleteConfirmModal');
    const deleteForm = document.getElementById('deleteForm');
    const targetName = document.getElementById('deleteTargetName');

    // Виведення імені цілі у тексті підтвердження
    targetName.textContent = userName;

    // Динамічна зміна адреси дії для форми видалення
    deleteForm.action = `/admin/delete_user/${userId}`;

    modal.style.display = 'flex';
}

// Закриття вікна підтвердження видалення
function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
}

// Обробка події кліку по екрану для закриття модальних вікон через фон
window.onclick = function(event) {
    const deleteModal = document.getElementById('deleteConfirmModal');
    const userModal = document.getElementById('userModal');
    if (event.target == deleteModal) {
        closeDeleteModal();
    }
    if (event.target == userModal) {
        closeModal();
    }
}

