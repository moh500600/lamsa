const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const { fork } = require('child_process')

let mainWindow = null
let serverProcess = null

const PORT = process.env.PORT || 3000
const SERVER_URL = `http://localhost:${PORT}`

function getServerScriptPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, '../server/index.js')
  }
  const candidates = [
    path.join(app.getAppPath(), 'server/index.js'),
    path.join(process.resourcesPath, 'app/server/index.js'),
    path.join(process.resourcesPath, 'app.asar.unpacked/server/index.js')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

function startBackendServer() {
  const serverPath = getServerScriptPath()
  const cwd = path.dirname(path.dirname(serverPath))

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT)
  }

  try {
    serverProcess = fork(serverPath, [], { 
      cwd,
      env, 
      stdio: 'ignore' 
    })
  } catch (err) {
    console.error('Failed to fork backend server:', err)
  }
}

function waitForServer(url, timeoutMs = 25000) {
  const startTime = Date.now()
  return new Promise((resolve) => {
    function ping() {
      const req = http.get(url, () => {
        resolve(true)
      })
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          resolve(false)
        } else {
          setTimeout(ping, 300)
        }
      })
      req.end()
    }
    ping()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: 'لمسة روائع — نظام إدارة النشاط التجاري والظهور المحلي',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // إخفاء القوائم الافتراضية
  Menu.setApplicationMenu(null)

  // الروابط الخارجية (مثل Google Maps) تفتح في المتصفح الافتراضي للعميل
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.loadURL(SERVER_URL).catch(() => {
    setTimeout(() => {
      mainWindow.loadURL(SERVER_URL)
    }, 1500)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  startBackendServer()
  await waitForServer(SERVER_URL, 25000)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM')
    } catch {}
  }
})
