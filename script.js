let organizedStructure = {};

window.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '#0284c7';
            dropZone.style.background = '#1e293b';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '#334155';
            dropZone.style.background = '#0f172a';
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleDroppedFiles(files);
    }, false);
});

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

        document.getElementById('fileInput').value = filePaths.join(', ');
        organizeFiles();
        
    } catch (error) {
        console.error('Помилка імпорту з GitHub:', error);
        outputDiv.innerHTML = `❌ Помилка: ${error.message}`;
    }
}

function handleDroppedFiles(files) {
    const fileNames = [];
    for (let i = 0; i < files.length; i++) {
        fileNames.push(files[i].name);
    }
    
    if (fileNames.length > 0) {
        document.getElementById('fileInput').value = fileNames.join(', ');
        organizeFiles();
    }
}

function processManualInput() {
    organizeFiles();
}

function loadPreset(type) {
    const fileInput = document.getElementById('fileInput');
    const ignoreInput = document.getElementById('ignoreInput');
    const customRulesInput = document.getElementById('customRulesInput');

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
        outputDiv.innerHTML = "Будь ласка, введіть хоча б одне ім'я файлу або виконайте імпорт з GitHub.";
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

        const parts = file.split('.');
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
        resultHTML += `<br><span style="color: #94a3b8; font-size: 12px;">Проігноровано файлів: ${ignoredCount}</span>`;
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

// Генератор розумних шаблонів контенту залежно від імені файлу
function getFileTemplateContent(fileName) {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName === 'readme.md') {
        return `# Project Overview\n\nGenerated automatically via Microservice Automation Tool.\n\n## Getting Started\n1. Install dependencies\n2. Run the application`;
    }
    if (lowerName === 'package.json') {
        return `{\n  "name": "generated-project",\n  "version": "1.0.0",\n  "description": "Scaffolded project structure",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  },\n  "dependencies": {}\n}`;
    }
    if (lowerName === 'requirements.txt') {
        return `# Python dependencies\nrequests>=2.31.0\npandas>=2.0.0\npython-dotenv>=1.0.0`;
    }
    if (lowerName === '.gitignore') {
        return `node_modules/\nvenv/\n__pycache__/\n.env\n.DS_Store`;
    }
    if (lowerName.endsWith('.html')) {
        return `<!DOCTYPE html>\n<html lang="uk">\n<head>\n    <meta charset="UTF-8">\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>`;
    }
    if (lowerName.endsWith('.py')) {
        return `# -*- coding: utf-8 -*-\n\ndef main():\n    print("Microservice is running...")\n\nif __name__ == "__main__":\n    main()`;
    }
    if (lowerName.endsWith('.css')) {
        return `body {\n    font-family: Arial, sans-serif;\n    background-color: #0f172a;\n    color: #f8fafc;\n    margin: 0;\n    padding: 20px;\n}`;
    }
    
    // Універсальний дефолтний контент для інших файлів
    return `Автоматично згенерований шаблон для файлу: ${fileName}`;
}

async function downloadZip() {
    const zip = new JSZip();
    
    for (const [folderName, fileList] of Object.entries(organizedStructure)) {
        const folder = zip.folder(folderName);
        fileList.forEach(fileName => {
            const templateContent = getFileTemplateContent(fileName);
            folder.file(fileName, templateContent);
        });
    }

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scaffolded-project.zip';
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
        fileList.forEach((fileName, index) => {
            const isLast = index === fileList.length - 1;
            const prefix = isLast ? "│   └── " : "│   ├── ";
            treeText += `${prefix}${fileName}\n`;
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
