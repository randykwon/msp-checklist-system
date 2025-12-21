const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

async function startServer() {
  if (!isDev) {
    // 프로덕션에서는 내장 Next.js 서버 시작
    const serverPath = path.join(__dirname, '../server.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // 서버가 시작될 때까지 대기
    await new Promise((resolve) => {
      setTimeout(resolve, 3000); // 3초 대기
    });
  }
}

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false // API 호출을 위해 비활성화
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false // 준비될 때까지 숨김
  });

  // 개발 모드에서는 localhost, 프로덕션에서도 localhost 사용
  const startUrl = 'http://localhost:3010';

  mainWindow.loadURL(startUrl);

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 모드에서는 DevTools 자동 열기
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 앱이 준비되면 서버 시작 후 윈도우 생성
app.whenReady().then(async () => {
  await startServer();
  createWindow();
  
  // macOS에서 독에서 클릭했을 때 윈도우 재생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫혔을 때 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 서버 프로세스 종료
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

// 앱 종료 시 서버 프로세스 정리
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// macOS용 메뉴 설정
if (process.platform === 'darwin') {
  const template = [
    {
      label: 'AWS MSP 자체 평가 헬퍼 시스템',
      submenu: [
        {
          label: 'AWS MSP 자체 평가 헬퍼 시스템 정보',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: '서비스',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: 'AWS MSP 자체 평가 헬퍼 시스템 숨기기',
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: '다른 앱 숨기기',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: '모두 보기',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: '종료',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '편집',
      submenu: [
        { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '다시 실행', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '모두 선택', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { label: '새로고침', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '개발자 도구', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '실제 크기', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '확대', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '축소', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '전체 화면', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: '윈도우',
      submenu: [
        { label: '최소화', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '닫기', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 개발 모드에서 핫 리로드 지원
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}