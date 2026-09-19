let organizedStructure = {};

// Функція завантаження пресетів
function loadPreset(type) {
    const fileInput = document.getElementById('fileInput');
    const ignoreInput = document.getElementById('ignoreInput');

    if (type === 'python') {
        fileInput.value = "main.py, utils.py, requirements.txt, README.md, .env, test_script.py";
        ignoreInput.value = ".env, __pycache__, venv";
    } else if (type === 'web') {
        fileInput.value = "index.html, style.css, script.js, package.json, logo.png, hero.jpg";
        ignoreInput.value = "node_modules, .DS_Store";
    } else if (type === 'data') {
        fileInput.value = "analysis.ipynb, dataset.csv, report.pdf, config.json, output.png";
        ignoreInput.value = "*.tmp, .ipynb_checkpoints";
    }
    
    // Автоматично запускаємо сортування при виборі пресету
    organizeFiles();
}

function organizeFiles() {
    const input = document.getElementById('fileInput').value;
    const ignoreInput = document.getElementById('ignoreInput').value;
    const outputDiv = document.getElementById('output');
    const actionButtons = document.getElementById('actionButtons');
    
    if (!input.trim()) {
        outputDiv.innerHTML = "Будь ласка, введіть хоча б одне ім'я файлу.";
        actionButtons.style.display = 'none';
        return;
    }

    const files = input.split(',').map(f => f.trim()).filter(f => f.length > 0);
    const ignorePatterns = ignoreInput.split(',').map(p => p.trim()).filter(p => p.length > 0);

    let resultHTML = "<strong>Результати сортування:</strong><br>";
    organizedStructure = {};
    let ignoredCount = 0;

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
        
        if (!organizedStructure[ext]) {
            organizedStructure[ext] = [];
        }
        organizedStructure[ext].push(file);

        resultHTML += `➔ ${file} &nbsp;&nbsp;📂 [/${ext}/]<br>`;
    });

    if (ignoredCount > 0) {
        resultHTML += `<br><span style="color: #94a3b8; font-size: 12px;">Проігноровано файлів: ${ignoredCount}</span>`;
    }

    outputDiv.innerHTML = resultHTML;
    
    const hasFilesToDownload = Object.keys(organizedStructure).length > 0;
    actionButtons.style.display = hasFilesToDownload ? 'flex' : 'none';
}

async function downloadZip() {
    const zip = new JSZip();
    
    for (const [folderName, fileList] of Object.entries(organizedStructure)) {
        const folder = zip.folder(folderName);
        fileList.forEach(fileName => {
            folder.file(fileName, `Автоматично створений заповнювач для ${fileName}`);
        });
    }

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'structured-files.zip';
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
