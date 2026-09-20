let organizedStructure = {};
let loadedFileContents = {}; 
let currentEditingFile = null;

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('themeToggleBtn');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeBtn) themeBtn.textContent = '🌙';
    }

    // Автоматичне завантаження параметрів з URL (шеринг пресетів)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('files')) {
        document.getElementById('fileInput').value = decodeURIComponent(urlParams.get('files'));
    }
    if (urlParams.has('ignore')) {
        document.getElementById('ignoreInput').value = decodeURIComponent(urlParams.get('ignore'));
    }
    if (urlParams.has('rules')) {
        document.getElementById('customRulesInput').value = decodeURIComponent(urlParams.get('rules'));
    }
    
    if (urlParams.has('files') || urlParams.has('rules') || urlParams.has('ignore')) {
        organizeFiles();
    }

    // Глобальні гарячі клавіші (Ctrl + Enter для сортування, Esc для закриття модалки)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            organizeFiles();
            showToast('⚡ Сортування активовано гарячою клавішею!');
        }
        if (e.key === 'Escape') {
            closeFileEditor();
        }
    });

    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('click', () => {
        document.getElementById('folderInput').click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '#0284c7';
            dropZone.style.background = 'rgba(2, 132, 199, 0.05)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = 'var(--border-color)';
            dropZone.style.background = 'var(--input-bg)';
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

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 2500);
}

async function handleFolderSelect(event) {
    const files = event.target.files;
    processFileList(files);
}

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
        showToast('📂 Папку успішно імпортовано!');
    }
}

async function traverseFileTree(item, path, filePaths) {
    if (item.isFile) {
        await new Promise((resolve) => {
            item.file(async (file) => {
                const fullPath = path ? `${path}/${file.name}` : file.name;
                filePaths.push(fullPath);
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
        const path = file.webkitRelativePath || file.name;
        fileNames.push(path);
        
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
        showToast('Введіть репозиторій у форматі owner/repo', 'error');
        return;
    }

    outputDiv.innerHTML = "⏳ Отримання структури репозиторію з GitHub API...";

    try {
        const repoClean = repoInput.replace('https://github.com/', '').replace(/\/$/, '');
        const response = await fetch(`https://api.github.com/repos/${repoClean}/git/trees/HEAD?recursive=1`);
        
        if (!response.ok) {
            throw new Error('Репозиторій не знайдено або перевищено ліміт API.');
        }

        const data = await response.json();
        const filePaths = data.tree
            .filter(item => item.type === 'blob')
            .map(item => item.path);

        if (filePaths.length === 0) {
            outputDiv.innerHTML = "⚠️ У цьому репозиторії немає файлів.";
            return;
        }

        loadedFileContents = {}; 
        document.getElementById('fileInput').value = filePaths.join(', ');
        organizeFiles();
        showToast('🌐 GitHub репозиторій успішно завантажено!');
        
    } catch (error) {
        console.error('Помилка GitHub імпорту:', error);
        outputDiv.innerHTML = `❌ Помилка: ${error.message}`;
        showToast('Не вдалося імпортувати репозиторій', 'error');
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
    showToast('✨ Пресет успішно завантажено!');
}

function organizeFiles() {
    const input = document.getElementById('fileInput').value;
    const ignoreInput = document.getElementById('ignoreInput').value;
    const customRulesInput = document.getElementById('customRulesInput').value;
    const outputDiv = document.getElementById('output');
    const actionButtons = document.getElementById('actionButtons');
    const statsPanel = document.getElementById('statsPanel');
    
    if (!input.trim()) {
        outputDiv.innerHTML = "Будь ласка, оберіть папку, імпортуйте репозиторій або введіть назви файлів.";
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

    let resultHTML = "<strong>📊 Результати сортування (натисніть на файл для редагування):</strong><br><br>";
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

        resultHTML += `➔ <span onclick="openFileEditor('${file.replace(/'/g, "\\'")}')" style="color: #38bdf8; cursor: pointer; text-decoration: underline;" title="Редагувати вміст">${file}</span> &nbsp;&nbsp;📂 [/${targetFolder}/]<br>`;
    });

    if (ignoredCount > 0) {
        resultHTML += `<br><span style="color: var(--text-muted); font-size: 12px;">Проігноровано файлів: ${ignoredCount}</span>`;
    }

    const totalCategories = Object.keys(organizedStructure).length;
    if (totalProcessedFiles > 0) {
        statsPanel.style.display = 'block';
        statsPanel.innerHTML = `📈 <b>Аналітика сесії:</b> Опрацьовано: <b>${totalProcessedFiles}</b> | Створено папок: <b>${totalCategories}</b> | Відфільтровано: <b>${ignoredCount}</b>`;
    } else {
        statsPanel.style.display = 'none';
    }

    outputDiv.innerHTML = resultHTML;
    
    const hasFilesToDownload = totalProcessedFiles > 0;
    actionButtons.style.display = hasFilesToDownload ? 'flex' : 'none';
}

function openFileEditor(filePath) {
    currentEditingFile = filePath;
    document.getElementById('modalFileName').textContent = `Редагування: ${filePath}`;
    
    let content = loadedFileContents[filePath];
    if (content === undefined || content === null) {
        content = getFileTemplateContent(filePath);
    }
    
    document.getElementById('modalFileContent').value = content;
    document.getElementById('fileEditorModal').style.display = 'flex';
}

function closeFileEditor() {
    document.getElementById('fileEditorModal').style.display = 'none';
    currentEditingFile = null;
}

function saveFileContent() {
    if (currentEditingFile) {
        const newContent = document.getElementById('modalFileContent').value;
        loadedFileContents[currentEditingFile] = newContent;
        showToast(`Зміни для "${currentEditingFile}" збережено!`);
    }
    closeFileEditor();
}

function getFileTemplateContent(fileName) {
    if (loadedFileContents[fileName] !== undefined && loadedFileContents[fileName] !== null) {
        return loadedFileContents[fileName];
    }

    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('readme.md')) {
        return `# Project Overview\n\nRefactored automatically via Python & Web Automation Tools.`;
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
        showToast('📦 ZIP-архів успішно завантажено!');
    } catch (error) {
        console.error('Помилка ZIP:', error);
        showToast('Не вдалося створити архів', 'error');
    }
}

function exportPythonCli() {
    const ignoreInput = document.getElementById('ignoreInput').value;
    const customRulesInput = document.getElementById('customRulesInput').value;

    const ignorePatterns = ignoreInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const customRules = {};
    customRulesInput.split(',').forEach(rule => {
        const parts = rule.split(':');
        if (parts.length === 2) {
            const ext = parts[0].trim().toUpperCase();
            const folder = parts[1].trim().toUpperCase();
            if (ext && folder) customRules[ext] = folder;
        }
    });

    const pythonScriptCode = `# -*- coding: utf-8 -*-
import os
import shutil

# Згенеровано через Python & Web Automation Tools (Pro Edition)
IGNORE_PATTERNS = ${JSON.stringify(ignorePatterns)}
CUSTOM_RULES = ${JSON.stringify(customRules)}

def organize_directory(target_dir="."):
    print(f"🚀 Організація директорії: {os.path.abspath(target_dir)}")
    for item in os.listdir(target_dir):
        if item in IGNORE_PATTERNS or item == "organize.py":
            continue
        item_path = os.path.join(target_dir, item)
        if os.path.isdir(item_path):
            continue
        ext = item.split('.')[-1].upper() if '.' in item else "NO_EXTENSION"
        target_folder = CUSTOM_RULES.get(ext, ext)
        folder_path = os.path.join(target_dir, target_folder)
        os.makedirs(folder_path, exist_ok=True)
        dest_path = os.path.join(folder_path, item)
        if not os.path.exists(dest_path):
            shutil.move(item_path, dest_path)
            print(f"➔ Переміщено: {item} -> {target_folder}/")

if __name__ == "__main__":
    organize_directory()
`;

    const blob = new Blob([pythonScriptCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organize.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥 Python CLI скрипт завантажено!');
}

function exportGitignore() {
    const ignoreInput = document.getElementById('ignoreInput').value;
    const ignorePatterns = ignoreInput.split(',').map(p => p.trim()).filter(p => p.length > 0);

    const gitignoreContent = `# Generated by Python & Web Automation Tools\n` + ignorePatterns.join('\n') + `\n`;

    const blob = new Blob([gitignoreContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.gitignore';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📄 Файл .gitignore успішно згенеровано!');
}

function sharePresetUrl() {
    const files = document.getElementById('fileInput').value.trim();
    const ignore = document.getElementById('ignoreInput').value.trim();
    const rules = document.getElementById('customRulesInput').value.trim();

    const url = new URL(window.location.origin + window.location.pathname);
    if (files) url.searchParams.set('files', files);
    if (ignore) url.searchParams.set('ignore', ignore);
    if (rules) url.searchParams.set('rules', rules);

    navigator.clipboard.writeText(url.toString()).then(() => {
        showToast('🔗 Посилання скопійовано в буфер!');
    }).catch(() => {
        prompt('Скопіюйте посилання вручну:', url.toString());
    });
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
        showToast('📋 Дерево проєкту скопійовано!');
    }).catch(() => {
        showToast('Не вдалося скопіювати', 'error');
    });
}
