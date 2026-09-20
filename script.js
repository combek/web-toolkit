// Ініціалізація логіки та сканера чутливих даних

document.addEventListener('DOMContentLoaded', () => {
    initSecretsLinter();
});

// Регулярні вирази для пошуку секретів
const SECRET_PATTERNS = [
    { name: 'GitHub Token', regex: /(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})/g },
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/g },
    { name: 'Generic API Key / Secret', regex: /(api[_-]?key|secret[_-]?key|password|auth[_-]?token)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{8,}/g },
    { name: 'Slack Token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})/g },
    { name: 'Supabase / JWT Token', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/g }
];

function initSecretsLinter() {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const resultsContainer = document.getElementById('scan-results');
    const resultsContent = document.getElementById('results-content');

    if (!fileInput || !dropZone) return;

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Підтримка Drag and Drop
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        dropZone.classList.add('border-blue-500'); 
    });
    
    dropZone.addEventListener('dragleave', () => { 
        dropZone.classList.remove('border-blue-500'); 
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    });

    async function handleFiles(files) {
        resultsContent.innerHTML = '';
        resultsContainer.classList.remove('hidden');
        
        let totalIssues = 0;

        for (const file of files) {
            try {
                const text = await file.text();
                const issues = scanText(text);

                if (issues.length > 0) {
                    totalIssues += issues.length;
                    const fileBlock = document.createElement('div');
                    fileBlock.className = 'p-3 bg-red-950/40 border border-red-800 rounded-lg';
                    
                    let issuesHtml = `<span class="font-bold text-red-400">📄 ${file.name}</span><ul class="list-disc ml-5 mt-1 text-xs text-red-300">`;
                    issues.forEach(issue => {
                        issuesHtml += `<li>Знайдено <b>${issue.type}</b> (рядок ~${issue.line})</li>`;
                    });
                    issuesHtml += `</ul>`;
                    
                    fileBlock.innerHTML = issuesHtml;
                    resultsContent.appendChild(fileBlock);
                }
            } catch (err) {
                console.error(`Помилка читання файлу ${file.name}:`, err);
            }
        }

        if (totalIssues === 0) {
            resultsContent.innerHTML = `<div class="p-3 bg-green-950/40 border border-green-800 rounded-lg text-green-400 font-medium">✅ Загроз не виявлено! Ваші файли чисті.</div>`;
        }
    }

    function scanText(text) {
        const lines = text.split('\n');
        const foundIssues = [];

        lines.forEach((line, index) => {
            SECRET_PATTERNS.forEach(pattern => {
                if (pattern.regex.test(line)) {
                    foundIssues.push({ type: pattern.name, line: index + 1 });
                }
            });
        });

        return foundIssues;
    }
}
// Обробка кліку на кнопку купівлі Pro-тарифу
const upgradeBtn = document.getElementById('upgrade-btn');
if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
        alert('Дякуємо за інтерес до Pro-версії! У реальному середовищі тут відбуватиметься перенаправлення на платіжний шлюз (Stripe / LiqPay / WayForPay).');
    });
}
