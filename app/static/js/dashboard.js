// Очікування повного завантаження структури документа
document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('popularDestinationsChart');

    if (ctx) {
        // Перевірка наявності полотна для графіка та переданих даних із сервера
        if (typeof chartLabels !== 'undefined' && typeof chartData !== 'undefined') {

            // Створення нового графіка (doughnut chart)
            new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Кількість замовлень',
                        data: chartData,
                        backgroundColor: ['#0B77F8', '#579CED', '#8FC2FF', '#32639E', '#B4D3EE'],
                        borderWidth: 2,
                        borderColor: '#FFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            // Розміщення легенди праворуч від графіка
                            position: 'right',
                            labels: {
                                font: {
                                    family: "'Open Sans', sans-serif",
                                    size: 14
                                },
                                padding: 20
                            }
                        }
                    },
                    // Налаштування товщини кільця для більш сучасного вигляду
                    cutout: '70%' 
                }
            });
        }
    }
});