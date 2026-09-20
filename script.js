// ==========================================
// 1. ПАТЕРНИ ДЛЯ СКАНУВАННЯ СЕКРЕТІВ (SECRETS LINTER)
// ==========================================
const SECRET_PATTERNS = [
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{20,}/g },
    { name: 'Telegram Bot Token', regex: /\d{9,10}:[a-zA-Z0-9_-]{35}/g },
    { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}/g },
    { name: 'Generic Private Key', regex: /-----BEGIN (RSA|EC|PRIVATE) KEY-----/g },
    { name: 'Potential Password / Secret', regex: /(password|secret|api_key|access_token)\s*=\s*['"][^'"]{4,}[\"']/gi }
];

/**
 * Перевіряє текст файлу на наявність чутливих даних
 */
function scanFileForSecrets(fileName, fileContent) {
    const findings = [];
    const isSensitiveFile = ['.env', 'config.json', 'settings.py', 'secrets.json'].some(ext => fileName.endsWith(ext));

    for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(fileContent)) {
            findings.push({
                file: fileName,
                type: pattern.name,
                severity: isSensitiveFile ? 'HIGH' : 'MEDIUM',
                message: `⚠️ Увага: У файлі "${fileName}" знайдено ${pattern.name}!`
            });
        }
    }
    return findings;
}

// ==========================================
// 2. ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ РОБОТИ З ФАЙЛАМИ
// ==========================================
function isTextFile(filename) {
    const textExtensions = ['.txt', '.env', '.json', '.js', '.py', '.md', '.yml', '.yaml', '.xml', '.html', '.css'];
    return textExtensions.some(ext => filename.endsWith(ext)) || !filename.includes('.');
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// ==========================================
// 3. ІНТЕРФЕЙС ТА ВИВЕДЕННЯ ПОПЕРЕДЖЕНЬ БЕЗПЕКИ
// ==========================================
function showSecurityAlertsUI(warnings) {
    let alertBox = document.getElementById('security-alerts');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'security-alerts';
        alertBox.className = 'bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700 shadow-md rounded-r';
        // Додаємо блок на початку сторінки або контейнера додатку
        const container = document.querySelector('main') || document.body;
        container.prepend(alertBox);
    }
    
    let html = `<strong class="block font-bold">🔒 Security Linter: Виявлено потенційні ризики витоку!</strong><ul class="list-disc pl-5 mt-2 space-y-1">`;
    warnings.forEach(w => {
        html += `<li>${w.message}</li>`;
    });
    html += `</ul><p class="text-xs mt-3 text-gray-600">Ваші файли обробляються локально у браузері, але не забудьте додати ці файли до .gitignore перед відправкою на GitHub!</p>`;
    
    alertBox.innerHTML = html;
}

function hideSecurityAlertsUI() {
    const alertBox = document.getElementById('security-alerts');
    if (alertBox) {
        alertBox.remove();
    }
}

// ==========================================
// 4. ГОЛОВНИЙ ОБРОБНИК (ЗАПУСК ПРИ ВИБОРІ ФАЙЛІВ)
// ==========================================
async function handleFilesSelection(files) {
    let allSecurityWarnings = [];

    for (const file of files) {
        if (isTextFile(file.name || file.webkitRelativePath)) {
            try {
                const content = await readFileAsText(file);
                const fileName = file.name || file.webkitRelativePath;
                
                // Скануємо файл на наявність секретів
                const warnings = scanFileForSecrets(fileName, content);
                if (warnings.length > 0) {
                    allSecurityWarnings.push(...warnings);
                }
            } catch (err) {
                console.error(`Не вдалося прочитати файл:`, err);
            }
        }
    }

    // Керуємо відображенням попереджень
    if (allSecurityWarnings.length > 0) {
        showSecurityAlertsUI(allSecurityWarnings);
    } else {
        hideSecurityAlertsUI();
    }
}

// ==========================================
// 5. ІНІЦІАЛІЗАЦІЯ ПОДІЙ (Drag & Drop / Input)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Приклад підключення до стандартного інпуту вибору файлів/папок
    const fileInput = document.getElementById('file-input'); // Замініть на ваш реальний ID інпуту
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                handleFilesSelection(files);
            }
        });
    }
});
