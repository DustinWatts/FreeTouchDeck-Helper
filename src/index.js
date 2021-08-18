const electron = require('electron');
const { ipcRenderer } = require('electron');
var ipc = require('electron').ipcRenderer;

// IPC rendered channels/listners setup
ipcRenderer.on('update-helper', (event, key, value) => {
  document.getElementById(key).value = value;
});

ipcRenderer.on('update-helpershortcut', (event, data) => {
  document.getElementById('helpershortcut').innerHTML = data;
});

ipcRenderer.on('output-return', (event, data) => {
  var output = document.getElementById('output').innerHTML;
  data.replace(/(\n)+/g, '<br />');
  output += data;
  output += '<br>';
  document.getElementById('output').innerHTML = output;

  var div = document.getElementById('output');
  div.scrollTop = div.scrollHeight - div.clientHeight;
});

ipcRenderer.on('update-history', (event, helper, value) => {
  var output = document.getElementById('history').innerHTML;
  value.replace(/(\n)+/g, '<br />');
  var newentry = `${formattedtime()} --> ${helper} (${value})`;
  
  output += newentry + '<br />';
  document.getElementById('history').innerHTML = output;

  var div = document.getElementById('history');
  div.scrollTop = div.scrollHeight - div.clientHeight;
});

// Our custom functions
function helperChanged(index, key) {
  ipc.send('change-helper', index, key, document.getElementById(key).value);
}

function opensettings() {
  ipc.send('opensettings', '');
}

function openfollower() {
  ipc.send('openfollower', '');
}

function clearhistory() {
  document.getElementById('history').innerHTML = '';
}

function clearoutput() {
  document.getElementById('output').innerHTML = '';
}

function formattedtime(){

  let date_ob = new Date();
  var hours = date_ob.getHours();
  if(hours < 10 ){
    hours = '0' + hours;
  }
  var minutes = date_ob.getMinutes();
  if(minutes < 10 ){
    minutes = '0' + minutes;
  }
  var seconds = date_ob.getSeconds();
  if(seconds < 10 ){
    seconds = '0' + seconds;
  }

  var time = hours + ':' + minutes + ':' + seconds;
  return time;

}

function changefollow(){

  var followonoff = document.getElementById('followonoff');
  if (followonoff.checked != true)
  {
    ipc.send('start-follow');
  }else{
    ipc.send('stop-follow');
  }

}

// Let our main process know index.js is completely loaded
ipc.send('did-finish-load');

ipcRenderer.on('setcheckbox', (event, check) => {

if(check){

  document.getElementById("followonoff").checked = true;

}

});
