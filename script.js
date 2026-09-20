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
// 2. ОСНОВНА ЛОГІКА ОБРОБКИ ФАЙЛІВ (Інтеграція)
// ==========================================
async function processFiles(files) {
    let allSecurityWarnings = [];

    for (const file of files) {
        // Читаємо лише текстові файли, щоб уникнути помилок на бінарних (картинки, архіви тощо)
        if (isTextFile(file.name)) {
            try {
                const content = await readFileAsText(file);
                
                // ЗАПУСКАЄМО СКАНЕР БЕЗПЕКИ ДЛЯ КОЖНОГО ФАЙЛУ
                const warnings = scanFileForSecrets(file.name, content);
                if (warnings.length > 0) {
                    allSecurityWarnings.push(...warnings);
                }
            } catch (err) {
                console.error(`Не вдалося прочитати файл ${file.name}:`, err);
            }
        }
    }

    // Якщо знайшли секрети — виводимо користувачу попередження в інтерфейсі
    if (allSecurityWarnings.length > 0) {
        showSecurityAlertsUI(allSecurityWarnings);
    } else {
        hideSecurityAlertsUI();
    }
}

// Допоміжні функції (якщо їх ще немає у вашому коді)
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

// Відображення попереджень в інтерфейсі (можете адаптувати під свої елементи)
function showSecurityAlertsUI(warnings) {
    // Приклад: створюємо або знаходимо блок попереджень на сторінці
    let alertBox = document.getElementById('security-alerts');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'security-alerts';
        alertBox.className = 'bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700';
        // Вставляємо перед списком файлів або результатами
        document.body.prepend(alertBox); 
    }
    
    let html = `<strong>🔒 Security Linter: Виявлено потенційні ризики витоку!</strong><ul class="list-disc pl-5 mt-2">`;
    warnings.forEach(w => {
        html += `<li>${w.message}</li>`;
    });
    html += `</ul><p class="text-xs mt-2 text-gray-600">Ваші файли обробляються локально, але не забудьте додати ці файли до .gitignore!</p>`;
    
    alertBox.innerHTML = html;
}

function hideSecurityAlertsUI() {
    const alertBox = document.getElementById('security-alerts');
    if (alertBox) {
        alertBox.remove();
    }
}
