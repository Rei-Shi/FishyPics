const { app, BrowserWindow } = require('electron');
const myip = require('quick-local-ip');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const Config = {
    http_port: '8080',
    socket_port: '3030'
};

// Http server
const _app = express();
const server = require('http').Server(_app);
server.listen(Config.http_port);

// WSS server
const wss = new WebSocket.Server({ port: Config.socket_port });

// IP websocket'а и web сервера
console.log('[SERVER]: WebSocket on: ' + myip.getLocalIP4() + ':' + Config.socket_port);
console.log('[SERVER]: HTTP on: ' + myip.getLocalIP4() + ':' + Config.http_port);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        acceptFirstMouse: true,
        autoHideMenuBar: true,
        useContentSize: true,
    });

    mainWindow.loadURL('http://localhost:8080');
    mainWindow.focus();
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

/**
 * EXPRESS
 */
_app.use(bodyParser.urlencoded({
    extended: false
}));

_app.use('/assets', express.static(__dirname + '/www/assets'))

_app.get('/', function (req, res) {
    res.sendFile(__dirname + '/www/index.html');
});

/**
 * WEBSOCKET
 */
wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4();
};

let isImageVisible = false;

function broadcastImageVisibility(client) {
    send(client, { imageVisible: isImageVisible });
}

function send(client, data) {
    data = JSON.stringify(data);
    client.send(data);
}

function sendAll(data) {
    data = JSON.stringify(data);

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

wss.on('connection', function connection(ws, req) {
    console.log('Client connected.');

    ws.id = wss.getUniqueID;

    // При подключении клиента отправляем текущее состояние видимости изображения
    send(ws, { imageVisible: isImageVisible });

    ws.on('close', function close() {
        console.log('[SERVER]: Client disconnected.');
    });

    ws.on('message', function incoming(receiveData) {
        try {
            const data = JSON.parse(receiveData);
            if (data.imageVisible !== undefined) {
                isImageVisible = data.imageVisible;
                sendAll({ imageVisible: isImageVisible });
                console.log(`Image visibility broadcasted: ${isImageVisible}`);
            }
        } catch (error) {
            console.error('[SERVER]: Error parsing message:', error);
        }
    });
});