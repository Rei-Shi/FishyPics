/**
 * Соединение и взаимодействие с сервером
 */
let Connect = {
    connection: null,
    connection_status: false,
    ip_address: window.location.hostname,
    port: '3030',

    start: function () {
        this.connection = new WebSocket('ws://' + this.ip_address + ':' + this.port);

        this.connection.onopen = function (e) {
            Connect.connection_status = true;
            console.log("Connection established!");
            $('.window .title').html('Connected.');
        };

        this.connection.onmessage = function (e) {
            try {
                const data = JSON.parse(e.data);
                if (data.imageVisible !== undefined) {
                    setImageVisibility(data.imageVisible);
                }
            } catch (error) {
                console.error('[CLIENT]: Error parsing message:', error);
            }
        };

        this.connection.onclose = function (e) {
            console.log("Connection closed!");
            this.connection_status = false;
        };

        this.connection.onerror = function (e) {
            console.log("Connection error!");
            this.connection_status = false;
        };
    },

    sendMessage: function (data) {
        if (this.connection_status === false) return;
        var data = JSON.stringify(data);
        this.connection.send(data);
    },
};

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