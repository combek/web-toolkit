let organizedStructure = {};

function organizeFiles() {
    const input = document.getElementById('fileInput').value;
    const ignoreInput = document.getElementById('ignoreInput').value;
    const outputDiv = document.getElementById('output');
    const downloadBtn = document.getElementById('downloadZipBtn');
    
    if (!input.trim()) {
        outputDiv.innerHTML = "Будь ласка, введіть хоча б одне ім'я файлу.";
        downloadBtn.style.display = 'none';
        return;
    }

    // Отримуємо список файлів та список масок для ігнорування
    const files = input.split(',').map(f => f.trim()).filter(f => f.length > 0);
    const ignorePatterns = ignoreInput.split(',').map(p => p.trim()).filter(p => p.length > 0);

    let resultHTML = "<strong>Результати сортування:</strong><br>";
    organizedStructure = {};
    
    let ignoredCount = 0;

    files.forEach(file => {
        // Перевіряємо, чи підпадає файл під правила ігнорування
        const isIgnored = ignorePatterns.some(pattern => {
            if (pattern.includes('*')) {
                // Проста підтримка зірочки (наприклад, temp.*)
                const regex = new RegExp('^' + pattern.replace('*', '.*') + '$', 'i');
                return regex.test(file);
            }
            return file.toLowerCase() === pattern.toLowerCase();
        });

        if (isIgnored) {
            ignoredCount++;
            return; // Пропускаємо цей файл
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
    
    // Показуємо кнопку завантаження, тільки якщо є файли після фільтрації
    const hasFilesToDownload = Object.keys(organizedStructure).length > 0;
    downloadBtn.style.display = hasFilesToDownload ? 'block' : 'none';
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
