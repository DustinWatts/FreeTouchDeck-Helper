// Requirements
const { app, globalShortcut, BrowserWindow, Menu, Tray } = require('electron');
const path = require('path');
const cp = require('child_process');
var ipc = require('electron').ipcMain;
const storage = require('electron-json-storage');
const activeWindows = require('electron-active-window');
const os = require('os');
const SerialPort = require('serialport');

// Child process execute options
const exec_options = {
  cwd: null,
  env: null,
  encoding: 'utf8',
  timeout: 0,
  maxBuffer: 200 * 1024,
  killSignal: 'SIGTERM',
};

// Global variables
let win;
let settingswin = null;
let followerwin = null;
var helpers = ['', '', '', '', '', '', '', '', '', '', ''];
var modifiers = ['Alt', 'Shift', ''];
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
var windowHeight = 720;
let tray = null;
let isQuiting;
var allWindows = [];
var captureIntervalID;
var portsList = [];
let pollinterval = 500;
var apptomenu = ['none', 'none', 'none', 'none', 'none'];
var previousactive = '';
var currentactive = '';
var ftdport;
var port;
var following = false;
var followintervalID;
var followonstart = false;
var minimizeOnStartup = false;

// Template used for creating a menu
const menuTemplate = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
];

// Set the application menu
const appmenu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(appmenu);

// Our app methods
app.on('ready', () => {
  tray = new Tray(path.join(__dirname, '/assets/icons/tray.png'));

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show',
        click: function () {
          win.show();
        },
      },
      {
        label: 'Quit',
        click: function () {
          isQuiting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on('right-click', () => {
    tray.popUpContextMenu();
  });

  tray.setToolTip('FreeTouchDeck-Helper');

  tray.on('click', () => {
    if (isWin) {
      win.show();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuiting = true;
});

// Our IPC methods
ipc.on('did-finish-load', function (event) {
  storage.has('settings', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Settings non-existant, creating new.');
      storage.set(
        'settings',
        {
          modifier1: modifiers[0],
          modifier2: modifiers[1],
          modifier3: modifiers[2],
        },
        function (error) {}
      );
      createShortcuts();
      helpersare = `Helpers listen to `;
      for (const value in modifiers) {
        if (modifiers[value] !== '') {
          helpersare += `${modifiers[value]} + `;
        }
      }
      helpersare += `F1 - F11`;
      win.webContents.send('update-helpershortcut', helpersare);
    } else {
      storage.get('settings', function (error, data) {
        modifiers = [];
        var helpersare = 'Helpers listen to';
        for (const [key, value] of Object.entries(data)) {
          modifiers.push(value);
          if (value !== '') {
            helpersare += ` ${value} +`;
          }
        }
        createShortcuts();
        helpersare += ` F1 - F11`;
        win.webContents.send('update-helpershortcut', helpersare);
        if(following){
          win.webContents.send('setcheckbox', following);
        }
        
      });
    }
  });

  fillHelpers();
});

ipc.on('opensettings', function (event) {
  if (settingswin == null) {
    createSettingsWindow();
  }
});

ipc.on('openfollower', function (event) {
  if (followerwin == null) {
    createFollowerWindow();
  }
});

ipc.on('settingsloaddone', function (event) {
  settingswin.webContents.send(
    'fill-settings',
    modifiers[0],
    modifiers[1],
    modifiers[2]
  );
});

ipc.on('savesettings', function (event, modifier1, modifier2, modifier3) {
  storage.set(
    'settings',
    {
      modifier1: modifier1,
      modifier2: modifier2,
      modifier3: modifier3,
    },
    function (error) {}
  );
  globalShortcut.unregisterAll();
  modifiers = [modifier1, modifier2, modifier3];
  createShortcuts();
  settingswin.close();

  helpersare = `Helpers listen to `;
  for (const value in modifiers) {
    if (modifiers[value] !== '') {
      helpersare += `${modifiers[value]} + `;
    }
  }
  helpersare += `F1 - F11`;
  win.webContents.send('update-helpershortcut', helpersare);
});

ipc.on('cancelsettings', function (event) {
  settingswin.close();
});

ipc.on('cancelfollower', function (event) {
  followerwin.close();
});

ipc.on(
  'savefollower',
  function (
    event,
    follow1,
    follow2,
    follow3,
    follow4,
    follow5,
    port,
    followonstartcheck
  ) {
    //console.log('Saving follower');
    apptomenu[0] = follow1;
    apptomenu[1] = follow2;
    apptomenu[2] = follow3;
    apptomenu[3] = follow4;
    apptomenu[4] = follow5;
    saveFollowers();
    ftdport = port;
    followonstart = followonstartcheck;
    savePort();
    followerwin.close();
  }
);

ipc.on('change-helper', function (event, index, key, value) {
  helpers[index] = value;
  saveHelpers();
});

ipc.on('start-capture', function (event, index, key, value) {
  captureIntervalID = setInterval(whatIsActive, 700);
});

ipc.on('stop-capture', function (event, index, key, value) {
  clearInterval(captureIntervalID);

  followerwin.webContents.send('fill-windows', allWindows);
});

ipc.on('start-follow', function (event) {
  follow();
});

ipc.on('stop-follow', function (event) {
  follow();
});

// Our custom functions
function fillHelpers() {
  storage.has('helpers', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Helpers non-existant, creating new.');
      storage.set(
        'helpers',
        {
          helper1: '',
          helper2: '',
          helper3: '',
          helper4: '',
          helper5: '',
          helper6: '',
          helper7: '',
          helper8: '',
          helper9: '',
          helper10: '',
          helper11: '',
        },
        function (error) {}
      );
    } else {
      storage.get('helpers', function (error, data) {
        helpers = [];
        for (const [key, value] of Object.entries(data)) {
          helpers.push(value);
          win.webContents.send('update-helper', key, value);
        }
      });
    }
  });
}

function saveHelpers() {
  storage.set(
    'helpers',
    {
      helper1: helpers[0],
      helper2: helpers[1],
      helper3: helpers[2],
      helper4: helpers[3],
      helper5: helpers[4],
      helper6: helpers[5],
      helper7: helpers[6],
      helper8: helpers[7],
      helper9: helpers[8],
      helper10: helpers[9],
      helper11: helpers[10],
    },
    function (error) {}
  );
}

function cpexecute(helper, data) {
  if (data === '') {
    win.webContents.send(
      'output-return',
      'Nothing, because command can not be empty.'
    );
    return;
  }

  cp.exec(data, exec_options, (err, stdout, stderr) => {
    if (err) {
      win.webContents.send('output-return', stderr);
      //console.log(stderr);
      return;
    }
    win.webContents.send('output-return', stdout);
    win.webContents.send('update-history', helper, data);
    //console.log(stdout);
  });
}

function createShortcuts() {
  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F1';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 1', helpers[0]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F2';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 2', helpers[1]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F3';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 3', helpers[2]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F4';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 4', helpers[3]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F5';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 5', helpers[4]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F6';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 6', helpers[5]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F7';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 7', helpers[6]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F8';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 8', helpers[7]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F9';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 9', helpers[8]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F10';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 10', helpers[9]);
  });

  var shortcut =
    modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F11';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 11', helpers[10]);
  });
}

function createWindow() {
  /* Windows creates the BrowserWindow a bit differently, so we make it a bit bigger
     to get rid of the vertical scrollbar.
  */
  if (isWin) {
    windowHeight = 740;
  }

  win = new BrowserWindow({
    useContentSize: true,
    resizable: false,
    width: 1280,
    height: windowHeight,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    icon: path.join(__dirname, 'assets/icons/linux/icon.png'),
  });
  win.loadFile('src/index.html');

  win.on('minimize', function (event) {
    event.preventDefault();
    win.hide();
  });

  win.on('close', function (event) {
    if (!isQuiting) {
      event.preventDefault();
      win.hide();
      event.returnValue = false;
    }
  });
}

function createSettingsWindow() {
  settingswin = new BrowserWindow({
    parent: win,
    useContentSize: true,
    resizable: false,
    frame: false,
    width: 550,
    height: 550,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    icon: path.join(__dirname, 'assets/icons/linux/icon.png'),
  });

  settingswin.loadFile('src/settings.html');

  settingswin.on('close', function () {
    // On close we clean up by set settingswin to NULL
    settingswin = null;
  });
}

function createFollowerWindow() {
  followerwin = new BrowserWindow({
    parent: win,
    useContentSize: true,
    resizable: false,
    frame: false,
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    icon: path.join(__dirname, 'assets/icons/linux/icon.png'),
  });

  followerwin.loadFile('src/follower.html');

  followerwin.on('close', function () {
    // On close we clean up by set settingswin to NULL
    followerwin = null;
  });
}

async function whatIsActive() {
  const activewindow = await activeWindows().getActiveWindow();
  if (os.platform() === 'win32') {
    //console.log(activewindow.windowClass);
    if (allWindows.indexOf(activewindow.windowClass) === -1) {
      allWindows.push(activewindow.windowClass);
    }
  } else if (os.platform() === 'darwin') {
    //console.log(activewindow.windowName);
    if (allWindows.indexOf(activewindow.windowName) === -1) {
      allWindows.push(activewindow.windowName);
    }
  }

  //console.log(allWindows)
}

async function listports() {
  var result = await SerialPort.list();

  result.forEach((port) => {
    portsList.push(port.path);
  });

  // console.log(portsList)
}

async function getActive() {
  const result = await activeWindows().getActiveWindow();

  if (os.platform() === 'win32') {
    currentactive = result.windowClass;
  } else if (os.platform() === 'darwin') {
    currentactive = result.windowName;
  } else {
    currentactive = result.windowName;
  }

  // Change this to fit your needs! These are CASE sensitive.
  if (currentactive != previousactive || previousactive === '') {
    previousactive = currentactive;
    if (currentactive === apptomenu[0]) {
      menu = 'menu1 ';
    } else if (currentactive === apptomenu[1]) {
      menu = 'menu2 ';
    } else if (currentactive === apptomenu[2]) {
      menu = 'menu3 ';
    } else if (currentactive === apptomenu[3]) {
      menu = 'menu4 ';
    } else if (currentactive === apptomenu[4]) {
      menu = 'menu5 ';
    } else {
      return;
    }

    await send(menu);
  }
}

async function follow() {
  if (!following) {
    port = new SerialPort(ftdport, {
      baudRate: 115200,
    },
    function (err) {
      if (err) {
        following = false;
        win.webContents.send(
          'output-return',
          `Follower ${err.message}`
        );
        return;
      }
    });

    followintervalID = setInterval(getActive, pollinterval);
    following = true;
  } else {
    following = false;
    clearInterval(followintervalID);
    port.close(function (err) {
      //console.log('port closed', err);
    });
  }
}

async function send(data) {
  port.write(`${data.toString()} `, function (err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    //console.log(`Data sent! ${currentactive} -> ${data.toString()}`);
  });
}

function saveFollowers() {
  storage.set(
    'followers',
    {
      menu1: apptomenu[0],
      menu2: apptomenu[1],
      menu3: apptomenu[2],
      menu4: apptomenu[3],
      menu5: apptomenu[4],
    },
    function (error) {}
  );
}

ipc.on('followersloaddone', function (event) {
  followerwin.webContents.send('fill-followers', apptomenu);

  followerwin.webContents.send('load-port', ftdport, followonstart);

  followerwin.webContents.send('fill-ports', portsList);
});

function loadfollowers() {
  storage.has('followers', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Helpers non-existant, creating new.');
      storage.set(
        'followers',
        {
          menu1: 'none',
          menu2: 'none',
          menu3: 'none',
          menu4: 'none',
          menu5: 'none',
        },
        function (error) {}
      );
    } else {
      storage.get('followers', function (error, data) {
        apptomenu = [];
        for (const [key, value] of Object.entries(data)) {
          apptomenu.push(value);
          //win.webContents.send('update-helper', key, value);
        }
      });
    }
  });
}

function loadport() {
  storage.has('port', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Port non-existant, creating new.');
      storage.set(
        'port',
        {
          port: 'none',
          followonstart: false,
        },
        function (error) {}
      );
    } else {
      storage.get('port', function (error, data) {
        ftdport = data.port;
        if (data.followonstart) {
          followonstart = true;

          follow();
        }
      });
    }
  });
}

function savePort() {
  storage.set(
    'port',
    {
      port: ftdport,
      followonstart: followonstart,
    },
    function (error) {}
  );
}

function loadgeneralsettings() {
  storage.has('general', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Helpers non-existant, creating new.');
      storage.set(
        'general',
        {
          minimizeOnStart: false
        },
        function (error) {}
      );
    } else {
      storage.get('general', function (error, data) {
        
        minimizeOnStartup = data.minimizeOnStart;
        //console.log(minimizeOnStartup)

        if(minimizeOnStartup){
          win.minimize()
        }


      });
    }
  });
}

listports();
loadfollowers();
loadport();
loadgeneralsettings();