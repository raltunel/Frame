# Claude Code Terminal - POC Dokümantasyonu

## Proje Özeti
IDE benzeri bir masaüstü uygulaması - sol panelde project explorer ve file tree, sağda tam özellikli terminal. Claude Code'u seçili proje dizininde başlatabilir, tüm dosya yapısını görebilir ve Windows Terminal'de yapılabilecek her şeyi yapabilirsiniz.

---

## Kullanılan Teknolojiler

### Ana Stack
- **Electron** (v28.0.0): Cross-platform masaüstü uygulama framework'ü
- **xterm.js** (v5.3.0): Browser-based terminal emülatörü (VS Code'un kullandığı)
- **node-pty** (v1.0.0): Pseudo Terminal (PTY) oluşturma kütüphanesi

### Neden Bu Teknolojiler?
- **Electron**: Windows, macOS, Linux'ta aynı kod tabanı çalışır
- **xterm.js**: ANSI renkleri, progress bar'lar, VT100 emülasyonu - tam terminal desteği
- **node-pty**: Gerçek PTY yaratır, Claude Code gibi interaktif CLI araçları için şart

---

## Mimari

```
┌─────────────────────────────────────────────────────────┐
│          Electron Main Process (main.js)                │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Menu API  │  │   Dialog     │  │  File System   │ │
│  │  Commands  │  │ (Folder Pick)│  │  (File Tree)   │ │
│  └────────────┘  └──────────────┘  └────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            node-pty (PTY Process)                │  │
│  │  PowerShell Core → Windows PowerShell / Bash    │  │
│  │  Working Dir: Selected Project Path             │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↕ IPC                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ↕
┌─────────────────────────┴───────────────────────────────┐
│       Electron Renderer (renderer.js + index.html)      │
│                                                         │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │  Sidebar Panel   │         │  Terminal Panel    │   │
│  │                  │         │                    │   │
│  │  Project Info    │         │   xterm.js         │   │
│  │  - Path Display  │         │   - PTY Output     │   │
│  │                  │         │   - User Input     │   │
│  │  Action Buttons  │         │   - FitAddon       │   │
│  │  - Select        │         │   - Scroll 10k     │   │
│  │  - Create        │         │                    │   │
│  │  - Start Claude  │         │                    │   │
│  │                  │         │                    │   │
│  │  File Tree       │         │                    │   │
│  │  📁 src/         │         │                    │   │
│  │    📄 index.js   │         │                    │   │
│  │  📁 test/        │         │                    │   │
│  │  📄 package.json │         │                    │   │
│  └──────────────────┘         └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Özellikler

### 1. IDE Benzeri Layout
- ✅ **Sol Panel - Project Explorer**
  - Project path gösterimi
  - Select Project Folder butonu (Electron dialog)
  - Create New Project butonu
  - Start Claude Code butonu (seçili dizinde PTY restart)
- ✅ **Sağ Panel - Terminal**
  - Tam ekran terminal emülatörü
  - Otomatik resize
- ✅ **Responsive Layout**
  - Flexbox tabanlı
  - Terminal her zaman optimal boyutta

### 2. File Tree Explorer
- ✅ Hiyerarşik dosya/klasör yapısı
- ✅ Collapsible folders (▶/▼ ile aç/kapa)
- ✅ 5 seviye derinlik
- ✅ Akıllı filtreleme (node_modules, gizli dosyalar hariç)
- ✅ İkonlu görünüm
  - 📁 Klasörler
  - 📄 Genel dosyalar
  - 📜 JavaScript (.js)
  - ⚙️ JSON (.json)
  - 📝 Markdown (.md)
- ✅ Alfabetik sıralama (klasörler önce)
- ✅ İndentation ile derinlik gösterimi

### 3. Tam Terminal Emülasyonu
- ✅ Gerçek PTY desteği
- ✅ ANSI renk kodları
- ✅ Progress bar'lar ve spinner'lar
- ✅ İnteraktif uygulamalar (Claude Code, vim, Python REPL vs)
- ✅ Terminal resize desteği
- ✅ 10,000 satır scroll history
- ✅ **PowerShell akıllı seçimi:**
  - Windows: PowerShell Core (pwsh) → fallback Windows PowerShell
  - macOS/Linux: bash

### 4. Project-Aware Claude Code
- ✅ PTY working directory seçili project path
- ✅ "Start Claude Code" butonu ile otomatik başlatma
- ✅ Terminal'de direkt o dizinde çalışır
- ✅ Claude Code full interaktif mod

### 5. Claude Commands Menüsü
- `/init` - Initialize Project (Ctrl+I)
- `/commit` - Commit Changes (Ctrl+Shift+C)
- `/review-pr` - Review PR
- `claude` - Start Claude Code (Ctrl+K)
- View Prompt History (Ctrl+H)

### 6. Prompt Logging
- Her terminal input'u otomatik kaydedilir
- Timestamp ile birlikte saklanır
- Backspace desteği (yanlış yazdıklarınız kaydedilmez)
- Dosya: `%APPDATA%/claude-terminal/prompts-history.txt` (Windows)
- Dosya: `~/Library/Application Support/claude-terminal/prompts-history.txt` (macOS)

### 7. UX İyileştirmeleri
- ✅ Butonlar `tabindex="-1"` ile Enter tuşu sadece terminalde çalışır
- ✅ Focus management - terminal her zaman input alabilir
- ✅ VS Code teması (koyu, modern)

---

## Başarısızlık ve Öğrenim Süreci

### İlk Deneme: Python + Tkinter ❌
**Ne Yaptık:**
- Python Tkinter ile ScrolledText widget kullandık
- subprocess.Popen ile PowerShell başlattık
- stdin/stdout pipe'ları ile iletişim kurmaya çalıştık

**Neden Başarısız Oldu:**
1. **PTY Desteği Yok**: subprocess.Popen gerçek terminal değil, basit pipe
2. **Encoding Sorunları**: Windows'ta charmap/utf-16 karmaşası
3. **Input Sorunları**: Karakterler parçalanıyor, komutlar tam gönderilemiyor
4. **İnteraktif Mod Çalışmıyor**: Claude Code stream response'ları gösteremiyor

**Temel Problem:**
Claude Code gibi modern CLI araçları **gerçek terminal** bekliyor:
- TTY detection
- ANSI escape sequence'ler
- Terminal boyutu bilgisi
- Signal handling

Basit subprocess bunları sağlayamıyor.

### İkinci Deneme: Electron + xterm.js + node-pty ✅
**Neden Başarılı:**
- **node-pty**: Windows'ta ConPTY, Unix'te PTY kullanarak gerçek terminal yaratır
- **xterm.js**: Terminal protokolünü tam anlar, ANSI kodlarını render eder
- **Cross-platform**: Aynı kod Windows, macOS, Linux'ta çalışır

---

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v16+)
- npm
- Windows: Build tools (npm install sırasında otomatik)
- macOS: Xcode Command Line Tools

### Kurulum
```bash
cd C:\Users\kaan\Desktop\deneme
npm install
```

### Çalıştırma
```bash
npm start
```

---

## Dosya Yapısı

```
deneme/
├── package.json          # Dependencies: electron, xterm, node-pty
├── main.js              # Electron main process
│                        #  - PTY management (PowerShell/bash)
│                        #  - Dialog (folder picker)
│                        #  - File tree generator
│                        #  - IPC handlers
│                        #  - Prompt logging
├── renderer.js          # Electron renderer
│                        #  - xterm.js setup
│                        #  - File tree renderer (collapsible)
│                        #  - Button handlers
│                        #  - Project state management
├── index.html           # UI Layout
│                        #  - Sidebar (project explorer + file tree)
│                        #  - Terminal container
│                        #  - CSS (VS Code style)
├── terminal_app.py      # [ESKİ] İlk Python denemesi (artık kullanılmıyor)
├── node_modules/        # npm dependencies
└── PROJECT_NOTES.md     # Bu dokümantasyon
```

---

## Kod Açıklamaları

### main.js - Ana Process

**1. Akıllı Shell Seçimi**
```javascript
let shell;
if (process.platform === 'win32') {
  try {
    execSync('where pwsh', { stdio: 'ignore' });
    shell = 'pwsh.exe';  // PowerShell Core
  } catch {
    shell = 'powershell.exe';  // Fallback
  }
} else {
  shell = 'bash';
}
```

**2. PTY Başlatma (Project-Aware)**
```javascript
function startPTY(workingDir = null) {
  const cwd = workingDir || currentProjectPath || process.env.HOME;

  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80, rows: 24,
    cwd: cwd,  // 👈 Seçili project path
    env: process.env
  });

  ptyProcess.onData((data) => {
    mainWindow.webContents.send('terminal-output', data);
  });
}
```

**3. File Tree Generator**
```javascript
function getFileTree(dirPath, maxDepth = 5, currentDepth = 0) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  // Skip hidden files and node_modules
  items.filter(item =>
    !item.name.startsWith('.') &&
    item.name !== 'node_modules'
  );

  // Sort: directories first
  items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    return a.name.localeCompare(b.name);
  });

  // Recursively get children
  return items.map(item => ({
    name: item.name,
    path: path.join(dirPath, item.name),
    isDirectory: item.isDirectory(),
    children: item.isDirectory() ?
      getFileTree(fullPath, maxDepth, currentDepth + 1) : undefined
  }));
}
```

**IPC (Inter-Process Communication):**
- `start-terminal`: Renderer → Main (PTY başlat)
- `restart-terminal`: Renderer → Main (PTY yeniden başlat, yeni path ile)
- `terminal-input`: Renderer → Main (kullanıcı input'u)
- `terminal-output`: Main → Renderer (PTY output'u)
- `terminal-resize`: Renderer → Main (pencere resize)
- `run-command`: Main → Renderer (menüden komut)
- `select-project-folder`: Renderer → Main (folder picker dialog)
- `create-new-project`: Renderer → Main (new project dialog)
- `project-selected`: Main → Renderer (seçilen path)
- `load-file-tree`: Renderer → Main (dosya yapısı iste)
- `file-tree-data`: Main → Renderer (dosya yapısı gönder)

### renderer.js - Terminal UI & File Tree

**1. Terminal Setup**
```javascript
const terminal = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  theme: { /* VS Code teması */ }
});

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById('terminal'));
fitAddon.fit();

terminal.onData((data) => {
  ipcRenderer.send('terminal-input', data);
});
```

**2. File Tree Rendering (Collapsible)**
```javascript
function renderFileTree(files, parentElement, indent = 0) {
  files.forEach(file => {
    const wrapper = document.createElement('div');
    const fileItem = document.createElement('div');
    fileItem.style.paddingLeft = `${8 + indent * 16}px`;

    // Arrow for folders
    if (file.isDirectory) {
      const arrow = document.createElement('span');
      arrow.textContent = '▶ ';
      arrow.className = 'folder-arrow';
      fileItem.appendChild(arrow);
    }

    // Icon + name
    fileItem.appendChild(getIcon(file));
    fileItem.appendChild(getName(file));

    // Children container (hidden by default)
    if (file.isDirectory && file.children) {
      const childrenContainer = document.createElement('div');
      childrenContainer.style.display = 'none';

      renderFileTree(file.children, childrenContainer, indent + 1);

      // Toggle on click
      fileItem.addEventListener('click', () => {
        const isExpanded = childrenContainer.style.display !== 'none';
        childrenContainer.style.display = isExpanded ? 'none' : 'block';
        arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
      });

      wrapper.appendChild(childrenContainer);
    }

    wrapper.appendChild(fileItem);
    parentElement.appendChild(wrapper);
  });
}
```

**3. Project State Management**
```javascript
let currentProjectPath = null;

function updateProjectUI(projectPath) {
  currentProjectPath = projectPath;

  if (projectPath) {
    // Enable "Start Claude Code" button
    document.getElementById('btn-start-claude').disabled = false;
    // Request file tree
    ipcRenderer.send('load-file-tree', projectPath);
  }
}

// Start Claude Code in selected project
document.getElementById('btn-start-claude').addEventListener('click', () => {
  ipcRenderer.send('restart-terminal', currentProjectPath);
  setTimeout(() => {
    ipcRenderer.send('terminal-input', 'claude\r');
  }, 1000);
});
```

### Prompt Logging
```javascript
// Her karakter için
for (let char of data) {
  if (char === '\r' || char === '\n') {
    // Enter - satırı kaydet
    const logEntry = `[${timestamp}] ${inputBuffer}\n`;
    fs.appendFileSync(logFilePath, logEntry);
  } else if (char === '\x7f') {
    // Backspace - son karakteri sil
    inputBuffer = inputBuffer.slice(0, -1);
  } else {
    // Normal karakter ekle
    inputBuffer += char;
  }
}
```

---

## Gelecek Geliştirmeler (Roadmap)

### Tamamlananlar ✅
- [x] IDE layout (sidebar + terminal)
- [x] Project selection (folder picker)
- [x] File tree explorer (hiyerarşik, collapsible)
- [x] PowerShell Core support
- [x] Project-aware Claude Code başlatma
- [x] Focus management (tabindex fix)

### Kısa Vadede
- [ ] File tree üzerinde dosya tıklama → terminal'de `cat` komut çalıştır
- [ ] Session bazlı prompt logging (Claude aktifken kaydet)
- [ ] File tree refresh butonu
- [ ] Dosya arama (search in files)
- [ ] Terminal history (up/down arrow geçmişi)
- [ ] Multiple terminal tabs
- [ ] Terminal split (yan yana)
- [ ] Tema seçenekleri (light/dark/custom)
- [ ] Sidebar genişlik ayarlanabilir (resize)

### Orta Vadede
- [ ] Mini text editor (basit dosya düzenleme)
- [ ] Claude Code özel UI (chat sidebar + context)
- [ ] Prompt templates (sık kullanılan komutlar)
- [ ] Session history browser
- [ ] Export session to markdown/PDF
- [ ] Git integration (status, diff gösterimi)
- [ ] Terminal output filtering/search
- [ ] Custom keyboard shortcuts (ayarlanabilir)
- [ ] Settings panel (preferences UI)

### Uzun Vadede
- [ ] AI assistant sidebar (Claude chat)
- [ ] Full project context awareness (workspace analizi)
- [ ] Visual git UI (commit, branch, merge)
- [ ] Extensions/Plugin system
- [ ] Cloud sync (projects, settings, sessions)
- [ ] Remote development (SSH, Docker)
- [ ] Built-in debugger
- [ ] Task runner UI (npm scripts, make vs)

---

## Performans Notları

### Avantajlar
- Gerçek terminal - %100 uyumluluk
- Cross-platform
- Modern, genişletilebilir

### Dezavantajlar
- Electron boyutu (~100MB)
- Bellek kullanımı (~150-200MB)

### Optimizasyon Fikirleri
- Tauri'ye geçiş (Rust backend, ~10MB)
- Lazy loading
- Virtual scrolling

---

## Öğrenilen Dersler

1. **Doğru Abstraction Seviyesi**
   - subprocess.Popen → Çok düşük seviye, terminal özelliği yok
   - PTY (node-pty) → Doğru seviye, gerçek terminal emülasyonu

2. **POC ≠ Basit Teknoloji**
   - Electron "ağır" görünse de, setup'tan sonra her şey çalışıyor
   - Python "basit" görünse de, düşük seviye problemlerle boğuşmak zaman kaybı

3. **Modern CLI Araçları Terminal Bekler**
   - Claude Code, Rich (Python), Ink (Node) gibi araçlar TTY tespit eder
   - TTY yoksa fallback mode'a geçerler (renkler, progress bar'lar yok)

4. **Cross-Platform Zorlukları**
   - Windows: ConPTY (Windows 10+), encoding (UTF-16/cp850)
   - macOS/Linux: PTY (POSIX standard)
   - node-pty hepsini hallediyor

---

## Kaynaklar

- [xterm.js Dokümantasyonu](https://xtermjs.org/)
- [node-pty GitHub](https://github.com/microsoft/node-pty)
- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Windows ConPTY](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)

---

## Geliştirici Notları

**Debug Mode:**
main.js içinde uncomment et:
```javascript
mainWindow.webContents.openDevTools();
```

**Log Dosyası Konumu:**
```bash
# Windows
echo %APPDATA%\claude-terminal\prompts-history.txt

# macOS
echo ~/Library/Application\ Support/claude-terminal/prompts-history.txt
```

**Build (Production):**
```bash
npm install electron-builder --save-dev
npm run build
```

---

## Lisans
MIT

---

**Proje Başlangıç:** 2026-01-21
**Son Güncelleme:** 2026-01-21
**Durum:** ✅ MVP - IDE Layout + File Explorer + Project-Aware Terminal
