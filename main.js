const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const os = require('os');
const path = require('path');

const Config = {
    http_port: '8080',
    socket_port: '3030'
};

// Http server
const _app = express();
const server = require('http').Server(_app);

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('[SERVER]: Cannot start the application because the HTTP port is already in use.');
        console.error('[SERVER]: Skipping HTTP server initialization.');
    } else {
        throw error;
    }
});

server.listen(Config.http_port, () => {
    console.log('[SERVER]: HTTP on: ' + ipAddress + ':' + Config.http_port + ' <--- Connect here');
});

// WSS server
const wss = new WebSocket.Server({ port: Config.socket_port });

wss.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('[SERVER]: Cannot start the WebSocket server because the port is already in use.');
        console.error('[SERVER]: Skipping WebSocket server initialization.');
    } else {
        throw error;
    }
});

wss.on('listening', () => {
    console.log('[SERVER]: WebSocket on: ' + ipAddress + ':' + Config.socket_port);
});

//Получаем IP устройства
const interfaces = os.networkInterfaces();
const wirelessInterface = interfaces['Беспроводная сеть'];
const ipAddress = wirelessInterface[0].address;

let mainWindow;

function createWindow() {
    let connectionAddress = 'localhost';

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        acceptFirstMouse: true,
        autoHideMenuBar: true,
        useContentSize: true,
    });

    const connectionPromise = new Promise((resolve) => {
        createConnectionWindow(resolve, setConnectionAddress);
    });

    connectionPromise.then(() => {
        mainWindow.loadURL(`http://${connectionAddress}:8080`);
        mainWindow.focus();
    });

    mainWindow.on('closed', function () {
        app.quit();
    });

    function setConnectionAddress(address) {
        connectionAddress = address;
    }

    ipcMain.on('set-connection-address', (event, address) => {
        setConnectionAddress(address);
    });

    // Меню приложения
    const template = [
        {
            label: 'Mode',
            submenu: [
                {
                    label: 'Server',
                    click: async () => {
                        setConnectionAddress('localhost');
                        await connectionPromise;
                        mainWindow.loadURL(`http://${connectionAddress}:8080`);
                    },
                },
                {
                    label: 'Client',
                    click: async () => {
                        await connectionPromise;
                        createConnectionWindow();
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createConnectionWindow(resolve, setConnectionAddress) {
    let connectionWindow = new BrowserWindow({
        width: 400,
        height: 200,
        title: 'Connection Mode',
        webPreferences: {
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    connectionWindow.loadFile('www/connectionWindow.html');

    ipcMain.on('connect', (event, ipAddress) => {
        if (ipAddress.trim() === '') {
            dialog.showErrorBox('Error', 'Please enter a valid IP address.');
        } else {
            setConnectionAddress(ipAddress);
            mainWindow.loadURL(`http://${ipAddress}:8080`);
            mainWindow.focus();
            connectionWindow.close();
            resolve();
        }
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