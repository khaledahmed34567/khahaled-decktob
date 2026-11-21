'use strict';
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('KA_DESKTOP', true);
