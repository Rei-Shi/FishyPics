$(function () {
    // Функция для установки видимости изображения
    function setImageVisibility(visible) {
        const imageElement = document.getElementById('displayedImage');
        if (imageElement) {
            if (visible) {
                imageElement.style.display = 'block';
            } else {
                imageElement.style.display = 'none';
            }
        }
    }

    // Объект для подключения к серверу
    const Connect = {
        connection: null,
        connection_status: false,
        ip_address: '192.168.43.45', // изменять по надобности
        port: '3030', // порт

        start: function () {
            this.connection = new WebSocket('ws://' + this.ip_address + ':' + this.port);

            this.connection.onopen = function (e) {
                Connect.connection_status = true;
                console.log("Connection established!");
                $('.window .title').html('Connected.');
            };

            // Обработка входящих сообщений от сервера
            this.connection.onmessage = function (e) {
                try {
                    const data = JSON.parse(e.data);
                    if (data.imageVisible !== undefined) {
                        // Обновляем состояние видимости изображения
                        setImageVisibility(data.imageVisible);
                    }
                } catch (error) {
                    console.error('[CLIENT]: Error parsing message:', error);
                }
            };

            // Обработка закрытия соединения
            this.connection.onclose = function (e) {
                console.log("Connection closed!");
                this.connection_status = false;
            };

            // Обработка ошибок
            this.connection.onerror = function (e) {
                console.log("Connection error!");
                this.connection_status = false;
            };
        },

        sendMessage: function (data) {
            if (this.connection_status === false) return;

            // Отправка сообщения на сервер
            var data = JSON.stringify(data);
            this.connection.send(data);
        },
    };

    // Обработчик кнопки для изменения видимости изображения
    $('.window .js-toggle-image').click(function (e) {
        e.preventDefault();

        // Меняем состояние изображения локально
        const imageVisible = $('#displayedImage').is(':visible');
        setImageVisibility(!imageVisible);

        // Отправляем новое состояние на сервер
        Connect.sendMessage({ imageVisible: !imageVisible });
        console.log(`Image visibility: ${!imageVisible}`);
    });

    // Запускаем соединение с сервером при загрузке страницы
    Connect.start();
});