let organizedStructure = {};
let loadedFileContents = {}; // Для майбутнього збереження вмісту реальних файлів

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('themeToggleBtn');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeBtn) themeBtn.textContent = '🌙';
    }

    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '#0284c7';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = 'var(--border-color)';
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            handleDroppedItems(items);
        } else {
            handleDroppedFiles(e.dataTransfer.files);
        }
    }, false);
});

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.textContent = isLight ? '🌙' : '☀️';
    }
}

// Обробка завантаження папки через системний діалог
async function handleFolderSelect(event) {
    const files = event.target.files;
    processFileList(files);
}

// Обробка перетягування папок або файлів у зону Drag-and-Drop
async function handleDroppedItems(items) {
    const filePaths = [];
    loadedFileContents = {};

    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
            await traverseFileTree(item, '', filePaths);
        }
    }

    if (filePaths.length > 0) {
        document.getElementById('fileInput').value = filePaths.join(', ');
        organizeFiles();
    }
}

async function traverseFileTree(item, path, filePaths) {
    if (item.isFile) {
        await new Promise((resolve) => {
            item.file(async (file) => {
                const fullPath = path ? `${path}/${file.name}` : file.name;
                filePaths.push(fullPath);
                
                // Зберігаємо оригінальний бінарний/текстовий контент файлу
                try {
                    const content = await file.text();
                    loadedFileContents[fullPath] = content;
                } catch (e) {
                    loadedFileContents[fullPath] = null;
                }
                resolve();
            });
        });
    } else if (item.isDirectory) {
        const dirReader = item.createReader();
        await new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
                for (let i = 0; i < entries.length; i++) {
                    await traverseFileTree(entries[i], path ? `${path}/${item.name}` : item.name, filePaths);
                }
                resolve();
            });
        });
    }
}

function processFileList(files) {
    const fileNames = [];
    loadedFileContents = {};
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // webkitRelativePath містить повний шлях у паці
        const path = file.webkitRelativePath || file.name;
        fileNames.push(path);
        
        // Зберігаємо контент асинхронно у фоні
        file.text().then(content => {
            loadedFileContents[path] = content;
        }).catch(() => {
            loadedFileContents[path] = null;
        });
    }
    
    if (fileNames.length > 0) {
        document.getElementById('fileInput').value = fileNames.join(', ');
        organizeFiles();
    }
}

function handleDroppedFiles(files) {
    processFileList(files);
}

async function importFromGitHub() {
    const repoInput = document.getElementById('githubRepoInput').value.trim();
    const outputDiv = document.getElementById('output');

    if (!repoInput) {
        alert('Будь ласка, введіть репозиторій у форматі owner/repo (наприклад, octocat/Spoon-Knife)');
        return;
    }

    outputDiv.innerHTML = "⏳ Завантаження структури з GitHub...";

    try {
        const repoClean = repoInput.replace('https://github.com/', '').replace(/\/$/, '');
        const response = await fetch(`https://api.github.com/repos/${repoClean}/git/trees/HEAD?recursive=1`);
        
        if (!response.ok) {
            throw new Error('Репозиторій не знайдено або перевищено ліміт запитів API.');
        }

        const data = await response.json();
        
        const filePaths = data.tree
            .filter(item => item.type === 'blob')
            .map(item => item.path);

        if (filePaths.length === 0) {
            outputDiv.innerHTML = "⚠️ У цьому репозиторії не знайдено файлів.";
            return;
        }

        loadedFileContents = {}; // Очищаємо кеш для GitHub
        document.getElementById('fileInput').value = filePaths.join(', ');
        organizeFiles();
        
    } catch (error) {
        console.error('Помилка імпорту з GitHub:', error);
        outputDiv.innerHTML = `❌ Помилка: ${error.message}`;
    }
}

function processManualInput() {
    organizeFiles();
}

function loadPreset(type) {
    const fileInput = document.getElementById('fileInput');
    const ignoreInput = document.getElementById('ignoreInput');
    const customRulesInput = document.getElementById('customRulesInput');
    loadedFileContents = {};

    if (type === 'python') {
        fileInput.value = "main.py, utils.py, requirements.txt, README.md, .env, test_script.py";
        ignoreInput.value = ".env, __pycache__, venv";
        customRulesInput.value = "md: docs, txt: docs";
    } else if (type === 'web') {
        fileInput.value = "index.html, style.css, script.js, package.json, logo.png, hero.jpg";
        ignoreInput.value = "node_modules, .DS_Store";
        customRulesInput.value = "html: public, css: assets/css, js: assets/js";
    } else if (type === 'data') {
        fileInput.value = "analysis.ipynb, dataset.csv, report.pdf, config.json, output.png";
        ignoreInput.value = "*.tmp, .ipynb_checkpoints";
        customRulesInput.value = "csv: data, ipynb: notebooks";
    }
    
    organizeFiles();
}

function organizeFiles() {
    const input = document.getElementById('fileInput').value;
    const ignoreInput = document.getElementById('ignoreInput').value;
    const customRulesInput = document.getElementById('customRulesInput').value;
    const outputDiv = document.getElementById('output');
    const actionButtons = document.getElementById('actionButtons');
    const statsPanel = document.getElementById('statsPanel');
    
    if (!input.trim()) {
        outputDiv.innerHTML = "Будь ласка, виберіть папку, імпортуйте репозиторій або введіть імена файлів.";
        actionButtons.style.display = 'none';
        statsPanel.style.display = 'none';
        return;
    }

    const files = input.split(',').map(f => f.trim()).filter(f => f.length > 0);
    const ignorePatterns = ignoreInput.split(',').map(p => p.trim()).filter(p => p.length > 0);

    const customRules = {};
    customRulesInput.split(',').forEach(rule => {
        const parts = rule.split(':');
        if (parts.length === 2) {
            const ext = parts[0].trim().toUpperCase();
            const folder = parts[1].trim().toUpperCase();
            if (ext && folder) {
                customRules[ext] = folder;
            }
        }
    });

    let resultHTML = "<strong>Результати сортування:</strong><br>";
    organizedStructure = {};
    let ignoredCount = 0;
    let totalProcessedFiles = 0;

    files.forEach(file => {
        const isIgnored = ignorePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace('*', '.*') + '$', 'i');
                return regex.test(file);
            }
            return file.toLowerCase() === pattern.toLowerCase();
        });

        if (isIgnored) {
            ignoredCount++;
            return;
        }

        const fileNameOnly = file.split('/').pop();
        const parts = fileNameOnly.split('.');
        const ext = parts.length > 1 ? parts.pop().toUpperCase() : 'NO_EXTENSION';
        const targetFolder = customRules[ext] || ext;

        if (!organizedStructure[targetFolder]) {
            organizedStructure[targetFolder] = [];
        }
        organizedStructure[targetFolder].push(file);
        totalProcessedFiles++;

        resultHTML += `➔ ${file} &nbsp;&nbsp;📂 [/${targetFolder}/]<br>`;
    });

    if (ignoredCount > 0) {
        resultHTML += `<br><span style="color: var(--text-muted); font-size: 12px;">Проігноровано файлів: ${ignoredCount}</span>`;
    }

    const totalCategories = Object.keys(organizedStructure).length;
    if (totalProcessedFiles > 0) {
        statsPanel.style.display = 'block';
        statsPanel.innerHTML = `📊 <strong>Аналітика:</strong> Оброблено файлів: <b>${totalProcessedFiles}</b> | Створено папок: <b>${totalCategories}</b> | Проігноровано: <b>${ignoredCount}</b>`;
    } else {
        statsPanel.style.display = 'none';
    }

    outputDiv.innerHTML = resultHTML;
    
    const hasFilesToDownload = totalProcessedFiles > 0;
    actionButtons.style.display = hasFilesToDownload ? 'flex' : 'none';
}

function getFileTemplateContent(fileName) {
    // Якщо для цього файлу вже є реальний завантажений контент з ПК — використовуємо його!
    if (loadedFileContents[fileName] !== undefined && loadedFileContents[fileName] !== null) {
        return loadedFileContents[fileName];
    }

    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('readme.md')) {
        return `# Project Overview\n\nRefactored automatically via Microservice Automation Tool.`;
    }
    if (lowerName.includes('package.json')) {
        return `{\n  "name": "refactored-project",\n  "version": "1.0.0"\n}`;
    }
    if (lowerName.includes('requirements.txt')) {
        return `requests>=2.31.0\npandas>=2.0.0`;
    }
    
    return `Автоматично згенерований вміст для: ${fileName}`;
}

async function downloadZip() {
    const zip = new JSZip();
    
    for (const [folderName, fileList] of Object.entries(organizedStructure)) {
        const folder = zip.folder(folderName);
        fileList.forEach(filePath => {
            const fileNameOnly = filePath.split('/').pop();
            const content = getFileTemplateContent(filePath);
            folder.file(fileNameOnly, content);
        });
    }

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'refactored-project.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Помилка генерації ZIP-архіву:', error);
        alert('Не вдалося згенерувати ZIP-архів.');
    }
}

function copyProjectTree() {
    let treeText = "```text\nproject-root/\n";
    
    for (const [folderName, fileList] of Object.entries(organizedStructure)) {
        treeText += `├── ${folderName}/\n`;
        fileList.forEach((filePath, index) => {
            const fileNameOnly = filePath.split('/').pop();
            const isLast = index === fileList.length - 1;
            const prefix = isLast ? "│   └── " : "│   ├── ";
            treeText += `${prefix}${fileNameOnly}\n`;
        });
    }
    treeText += "```";

    navigator.clipboard.writeText(treeText).then(() => {
        alert('Схему проєкту скопійовано у форматі Markdown!');
    }).catch(err => {
        console.error('Помилка копіювання:', err);
        alert('Не вдалося скопіювати схему.');
    });
}
