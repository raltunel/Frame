const { ipcRenderer } = require('electron');
const { Terminal } = require('xterm');
const { FitAddon } = require('xterm-addon-fit');

// Create terminal instance
const terminal = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  },
  allowTransparency: false,
  scrollback: 10000
});

// Fit addon to make terminal fill the container
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

// Open terminal in DOM
terminal.open(document.getElementById('terminal'));

// Fit terminal to window
fitAddon.fit();

// Welcome message
terminal.writeln('\x1b[1;32mClaude Code Terminal\x1b[0m');
terminal.writeln('Terminal başlatılıyor...\n');

// Handle terminal input
terminal.onData((data) => {
  ipcRenderer.send('terminal-input', data);
});

// Receive output from PTY
ipcRenderer.on('terminal-output', (event, data) => {
  terminal.write(data);
});

// Handle menu commands
ipcRenderer.on('run-command', (event, command) => {
  // Send command to terminal as if user typed it
  ipcRenderer.send('terminal-input', command + '\r');
});

// Handle window resize
window.addEventListener('resize', () => {
  fitAddon.fit();
  ipcRenderer.send('terminal-resize', {
    cols: terminal.cols,
    rows: terminal.rows
  });
});

// Project state
let currentProjectPath = null;

// Update project UI
function updateProjectUI(projectPath) {
  currentProjectPath = projectPath;
  const pathElement = document.getElementById('project-path');
  const startClaudeBtn = document.getElementById('btn-start-claude');
  const fileExplorerHeader = document.getElementById('file-explorer-header');

  if (projectPath) {
    pathElement.textContent = projectPath;
    pathElement.style.color = '#569cd6';
    startClaudeBtn.disabled = false;
    fileExplorerHeader.style.display = 'block';

    // Request file tree
    ipcRenderer.send('load-file-tree', projectPath);
  } else {
    pathElement.textContent = 'No project selected';
    pathElement.style.color = '#666';
    startClaudeBtn.disabled = true;
    fileExplorerHeader.style.display = 'none';
    document.getElementById('file-tree').innerHTML = '';
  }
}

// Render file tree
function renderFileTree(files, parentElement, indent = 0) {
  files.forEach(file => {
    // Create wrapper for folder + children
    const wrapper = document.createElement('div');
    wrapper.className = 'file-wrapper';

    const fileItem = document.createElement('div');
    fileItem.className = 'file-item' + (file.isDirectory ? ' folder' : '');
    fileItem.style.paddingLeft = `${8 + indent * 16}px`;

    // Add arrow for folders
    if (file.isDirectory) {
      const arrow = document.createElement('span');
      arrow.textContent = '▶ ';
      arrow.style.fontSize = '10px';
      arrow.style.marginRight = '4px';
      arrow.style.display = 'inline-block';
      arrow.style.transition = 'transform 0.2s';
      arrow.className = 'folder-arrow';
      fileItem.appendChild(arrow);
    }

    const icon = document.createElement('span');
    if (file.isDirectory) {
      icon.className = 'file-icon folder-icon';
    } else {
      const ext = file.name.split('.').pop();
      icon.className = `file-icon file-icon-${ext}`;
      if (!['js', 'json', 'md'].includes(ext)) {
        icon.className = 'file-icon file-icon-default';
      }
    }

    const name = document.createElement('span');
    name.textContent = file.name;

    fileItem.appendChild(icon);
    fileItem.appendChild(name);

    wrapper.appendChild(fileItem);

    // Create children container
    if (file.isDirectory && file.children && file.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'folder-children';
      childrenContainer.style.display = 'none'; // Start collapsed

      // Recursively render children
      renderFileTree(file.children, childrenContainer, indent + 1);
      wrapper.appendChild(childrenContainer);

      // Toggle folder on click
      fileItem.addEventListener('click', (e) => {
        e.stopPropagation();
        const arrow = fileItem.querySelector('.folder-arrow');
        const isExpanded = childrenContainer.style.display !== 'none';

        if (isExpanded) {
          childrenContainer.style.display = 'none';
          arrow.style.transform = 'rotate(0deg)';
        } else {
          childrenContainer.style.display = 'block';
          arrow.style.transform = 'rotate(90deg)';
        }
      });
    } else if (!file.isDirectory) {
      // File click handler
      fileItem.addEventListener('click', () => {
        console.log('File clicked:', file.path);
      });
    }

    parentElement.appendChild(wrapper);
  });
}

// Button handlers
document.getElementById('btn-select-project').addEventListener('click', () => {
  ipcRenderer.send('select-project-folder');
});

document.getElementById('btn-create-project').addEventListener('click', () => {
  ipcRenderer.send('create-new-project');
});

document.getElementById('btn-start-claude').addEventListener('click', () => {
  if (currentProjectPath) {
    // Restart terminal with new path
    ipcRenderer.send('restart-terminal', currentProjectPath);
    // Auto-start Claude Code
    setTimeout(() => {
      ipcRenderer.send('terminal-input', 'claude\r');
    }, 1000);
  }
});

// Receive selected project path
ipcRenderer.on('project-selected', (event, projectPath) => {
  updateProjectUI(projectPath);
  terminal.writeln(`\x1b[1;32m✓ Project selected:\x1b[0m ${projectPath}`);
});

// Receive file tree data
ipcRenderer.on('file-tree-data', (event, files) => {
  const fileTreeElement = document.getElementById('file-tree');
  fileTreeElement.innerHTML = '';
  renderFileTree(files, fileTreeElement);
});

// History Panel Management
let historyPanelVisible = false;

function toggleHistoryPanel() {
  const panel = document.getElementById('history-panel');
  historyPanelVisible = !historyPanelVisible;

  if (historyPanelVisible) {
    panel.classList.add('visible');
    loadPromptHistory();
  } else {
    panel.classList.remove('visible');
  }

  // Resize terminal to fit new layout
  setTimeout(() => {
    fitAddon.fit();
    ipcRenderer.send('terminal-resize', {
      cols: terminal.cols,
      rows: terminal.rows
    });
  }, 50);
}

function loadPromptHistory() {
  ipcRenderer.send('load-prompt-history');
}

function renderPromptHistory(historyData) {
  const container = document.getElementById('history-content');
  container.innerHTML = '';

  if (!historyData || historyData.trim() === '') {
    container.innerHTML = '<div style="color: #858585; padding: 10px; text-align: center;">No history yet</div>';
    return;
  }

  const lines = historyData.trim().split('\n');

  // Reverse to show newest first
  lines.reverse().forEach(line => {
    const match = line.match(/\[(.*?)\]\s+(.*)/);
    if (match) {
      const timestamp = match[1];
      const command = match[2];

      const item = document.createElement('div');
      item.className = 'history-item';

      const ts = document.createElement('div');
      ts.className = 'history-timestamp';
      ts.textContent = new Date(timestamp).toLocaleString();

      const cmd = document.createElement('div');
      cmd.className = 'history-command';
      cmd.textContent = command;

      item.appendChild(ts);
      item.appendChild(cmd);
      container.appendChild(item);
    }
  });
}

// Close button handler
document.getElementById('history-close').addEventListener('click', () => {
  toggleHistoryPanel();
});

// Receive prompt history data
ipcRenderer.on('prompt-history-data', (event, data) => {
  renderPromptHistory(data);
});

// Toggle from menu
ipcRenderer.on('toggle-history-panel', () => {
  toggleHistoryPanel();
});

// Keyboard shortcut: Ctrl+Shift+H
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'H') {
    e.preventDefault();
    toggleHistoryPanel();
  }
});

// Start terminal when ready
window.addEventListener('load', () => {
  // Give a moment for terminal to fully render
  setTimeout(() => {
    ipcRenderer.send('start-terminal');
    // Notify about resize
    ipcRenderer.send('terminal-resize', {
      cols: terminal.cols,
      rows: terminal.rows
    });
  }, 100);
});
