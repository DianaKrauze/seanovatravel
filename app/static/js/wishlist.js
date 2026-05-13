// Функція для перемикання стану обраного (додавання/видалення із списку бажань)
function toggleHeart(tourId, element) {
    // Відправка POST-запиту на сервер для зміни статусу туру
    fetch(`/toggle_wishlist/${tourId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        const img = element.querySelector('img');
        
        // Обробка стану, коли тур успішно додано
        if (data.status === 'added') {
            img.src = "/static/images/heart_red.png";
            element.classList.add('active');
        } 
        // Обробка стану, коли тур видалено зі списку обраного
        else {
            img.src = "/static/images/heart_black.png";
            element.classList.remove('active');
            
            // Спеціальна логіка для сторінки списку бажань (Wishlist)
            if (window.location.pathname.includes('/wishlist')) {
                // Пошук батьківської картки туру для її видалення з DOM
                const card = element.closest('.wishlist-card');
                
                if (card) {
                    // Анімація плавного зникнення елемента
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    
                    // Видалення картки після завершення анімації (через 300мс)
                    setTimeout(() => {
                        card.remove();
                        
                        // Перевірка кількості карток, що залишилися на сторінці
                        const remainingCards = document.querySelectorAll('.wishlist-card');
                        if (remainingCards.length === 0) {
                            // Перезавантаження для відображення повідомлення про порожній список
                            location.reload(); 
                        }
                    }, 300);
                }
            }
        }
    })
    .catch(err => console.error(err));
}