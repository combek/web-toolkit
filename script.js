/**
 * File Structure Organizer & Web Toolkit - Pro Edition
 * Complete script with Vercel Analytics event tracking integration
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const folderInput = document.getElementById('folderInput');
    const githubInput = document.getElementById('githubInput');
    const githubBtn = document.getElementById('githubBtn');
    const fileListArea = document.getElementById('fileListArea');
    const manualInput = document.getElementById('manualInput');
    const ignoreInput = document.getElementById('ignoreInput');
    const runBtn = document.getElementById('runBtn');
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const exportPythonBtn = document.getElementById('exportPythonBtn');
    const themeToggle = document.getElementById('themeToggle');
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    // State management
    let projectFiles = []; // Array of { name, path, content, size }
    let processedResults = null;

    // --- HELPER: Vercel Analytics Event Tracker ---
    function trackVercelEvent(eventName, eventData = {}) {
        if (typeof window.va !== 'undefined') {
            window.va('track', eventName, eventData);
        }
    }

    // --- THEME MANAGEMENT ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.textContent = '🌙';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            themeToggle.textContent = isLight ? '🌙' : '☀️';
        });
    }

    // --- INPUT METHODS: Presets ---
    const presets = {
        python: {
            manual: 'main.py, utils.py, requirements.txt, README.md, .env.example, tests/test_main.py, data/input.csv',
            ignore: '.venv, __pycache__, .git, dist, build, *.log'
        },
        web: {
            manual: 'index.html, style.css, script.js, package.json, README.md, src/app.js, assets/styles.css',
            ignore: 'node_modules, dist, .parcel-cache, .DS_Store'
        },
        data: {
            manual: 'notebook.ipynb, pipeline.py, config.yaml, README.md, data/raw/.gitkeep, data/processed/.gitkeep',
            ignore: '.ipynb_checkpoints, venv, output, *.csv'
        }
    };

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const presetKey = btn.getAttribute('data-preset');
            if (presets[presetKey]) {
                if (manualInput) manualInput.value = presets[presetKey].manual;
                if (ignoreInput) ignoreInput.value = presets[presetKey].ignore;
                parseManualInput();
                showToast(`Завантажено пресет: ${btn.textContent.trim()}`);
            }
        });
    });

    // --- INPUT METHODS: Folder Upload ---
    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            projectFiles = files.map(file => ({
                name: file.name,
                path: file.webkitRelativePath || file.name,
                content: '', // Will read if text
                size: file.size,
                fileObj: file
            }));
            
            // Read text contents asynchronously
            projectFiles.forEach((item, idx) => {
                if (item.size < 1024 * 1024 && isTextFile(item.name)) {
                    const reader = new FileReader();
                    reader.onload = (e) => { projectFiles[idx].content = e.target.result; };
                    reader.readAsText(item.fileObj);
                }
            });

            updateFileListUI();
            trackVercelEvent('Import Folder', { count: files.length });
            showToast(`Імпортовано файлів: ${files.length}`);
        });
    }

    // --- INPUT METHODS: Drag and Drop ---
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const items = e.dataTransfer.items;
            if (items && items.length > 0) {
                // Simplified handling for dropped files/text
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    projectFiles = files.map(file => ({
                        name: file.name,
                        path: file.name,
                        content: '',
                        size: file.size,
                        fileObj: file
                    }));
                    updateFileListUI();
                    trackVercelEvent('Drop Files', { count: files.length });
                    showToast(`Оброблено файлів з перетягування: ${files.length}`);
                }
            }
        });
    }

    // --- INPUT METHODS: GitHub API Import ---
    if (githubBtn && githubInput) {
        githubBtn.addEventListener('click', async () => {
            const repoPath = githubInput.value.trim();
            if (!repoPath || !repoPath.includes('/')) {
                showToast('Введіть репозиторій у форматі owner/repo');
                return;
            }

            showToast('Завантаження структури з GitHub...');
            try {
                const response = await fetch(`https://api.github.com/repos/${repoPath}/git/trees/main?recursive=1`);
                if (!response.ok) throw new Error('Репозиторій не знайдено або приватний');
                const data = await response.json();
                
                projectFiles = data.tree
                    .filter(item => item.type === 'blob')
                    .map(item => ({
                        name: item.path.split('/').pop(),
                        path: item.path,
                        content: `// Source from GitHub: ${repoPath}/${item.path}`,
                        size: item.size || 0
                    }));

                updateFileListUI();
                trackVercelEvent('Import GitHub', { repo: repoPath });
                showToast(`Успішно завантажено з GitHub: ${projectFiles.length} файлів`);
            } catch (err) {
                showToast('Помилка імпорту GitHub: перевірте назву');
            }
        });
    }

    // --- MANUAL INPUT PARSING ---
    if (manualInput) {
        manualInput.addEventListener('input', parseManualInput);
    }

    function parseManualInput() {
        if (!manualInput) return;
        const rawText = manualInput.value;
        const filenames = rawText.split(',').map(s => s.trim()).filter(Boolean);
        
        if (filenames.length > 0 && projectFiles.length === 0) {
            projectFiles = filenames.map(name => ({
                name: name,
                path: name,
                content: `# Автоматично створений файл: ${name}\n`,
                size: 100
            }));
            updateFileListUI();
        }
    }

    function isTextFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['js', 'ts', 'html', 'css', 'json', 'py', 'md', 'txt', 'yaml', 'yml', 'env', 'gitignore'].includes(ext);
    }

    function updateFileListUI() {
        if (!fileListArea) return;
        if (projectFiles.length === 0) {
            fileListArea.innerHTML = '<p class="placeholder-text">Файли не завантажені. Виберіть пачку або введіть списком нижче.</p>';
            return;
        }
        
        let html = `<div class="file-summary-badge">Завантажено елементів: <strong>${projectFiles.length}</strong></div>`;
        html += '<ul class="compact-file-list">';
        projectFiles.slice(0, 15).forEach(f => {
            html += `<li>📄 ${f.path}</li>`;
        });
        if (projectFiles.length > 15) {
            html += `<li class="more-items">...і ще ${projectFiles.length - 15} файлів</li>`;
        }
        html += '</ul>';
        fileListArea.innerHTML = html;
    }

    // --- CORE LOGIC: Sort & Process ---
    function runSortingEngine() {
        if (projectFiles.length === 0) {
            showToast('Будь ласка, додайте файли або оберіть пресет!');
            return;
        }

        const ignoreMasks = ignoreInput ? ignoreInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];

        // Filter out ignored files
        const filteredFiles = projectFiles.filter(file => {
            return !ignoreMasks.some(mask => {
                if (mask.startsWith('*.')) {
                    const ext = mask.slice(1);
                    return file.name.endsWith(ext);
                }
                return file.path.includes(mask);
            });
        });

        // Group by category/extension
        const categorized = {};
        filteredFiles.forEach(file => {
            const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'other';
            let category = 'misc';
            
            if (['py', 'js', 'ts', 'html', 'css'].includes(ext)) category = 'source_code';
            else if (['md', 'txt', 'pdf', 'doc'].includes(ext)) category = 'documents';
            else if (['json', 'csv', 'yaml', 'yml', 'env'].includes(ext)) category = 'configs';
            else if (['png', 'jpg', 'jpeg', 'svg', 'ico'].includes(ext)) category = 'assets';

            if (!categorized[category]) categorized[category] = [];
            categorized[category].push(file);
        });

        processedResults = categorized;
        trackVercelEvent('Run Sorting', { totalFiles: filteredFiles.length });
        showToast(`Успішно відсортовано ${filteredFiles.length} файлів за категоріями!`);
    }

    if (runBtn) {
        runBtn.addEventListener('click', runSortingEngine);
    }

    // --- EXPORT: ZIP Archive Generation (with JSZip) ---
    if (downloadZipBtn) {
        downloadZipBtn.addEventListener('click', async () => {
            if (!processedResults) {
                runSortingEngine();
                if (!processedResults) return;
            }

            if (typeof JSZip === 'undefined') {
                showToast('Помилка: бібліотека JSZip не завантажена');
                return;
            }

            const zip = new JSZip();
            for (const [category, files] of Object.entries(processedResults)) {
                const folder = zip.folder(category);
                files.forEach(file => {
                    folder.file(file.name, file.content || `Content for ${file.name}`);
                });
            }

            try {
                const content = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'organized-project-structure.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Track download event in Vercel Analytics
                trackVercelEvent('Download ZIP', { categoriesCount: Object.keys(processedResults).length });
                showToast('ZIP-архів успішно згенеровано та завантажено!');
            } catch (err) {
                showToast('Помилка генерації ZIP архіву');
            }
        });
    }

    // --- EXPORT: Python CLI Script Generation ---
    if (exportPythonBtn) {
        exportPythonBtn.addEventListener('click', () => {
            const pythonScriptContent = `# -*- coding: utf-8 -*-
"""
Auto-generated Python CLI Organizer Script
Generated via Web-Toolkit Pro Edition
"""
import os
import shutil

STRUCTURE = {
    "source_code": [".py", ".js", ".ts", ".html", ".css"],
    "documents": [".md", ".txt", ".pdf"],
    "configs": [".json", ".yaml", ".yml", ".env"],
    "assets": [".png", ".jpg", ".svg"]
}

def organize_directory(target_dir="."):
    for filename in os.listdir(target_dir):
        if filename.startswith(".") or os.path.isdir(filename):
            continue
        ext = os.path.splitext(filename)[1].lower()
        moved = False
        for folder, exts in STRUCTURE.items():
            if ext in exts:
                os.makedirs(os.path.join(target_dir, folder), exist_ok=True)
                shutil.move(os.path.join(target_dir, filename), os.path.join(target_dir, folder, filename))
                print(f"Moved: {filename} -> {folder}/")
                moved = True
                break

if __name__ == "__main__":
    print("Starting file organization...")
    organize_directory()
    print("Done!")
`;

            const blob = new Blob([pythonScriptContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'organize.py';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Track python script generation in Vercel Analytics
            trackVercelEvent('Generate Python Script');
            showToast('Python CLI скрипт (organize.py) успішно згенеровано!');
        });
    }

    // --- HOTKEYS SUPPORT ---
    document.addEventListener('keydown', (e) => {
        // Ctrl + Enter to run sorting
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runSortingEngine();
        }
    });

    // --- TOAST NOTIFICATIONS ---
    function showToast(message) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'background: #1e293b; color: #f8fafc; padding: 12px 20px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); font-size: 14px; border-left: 4px solid #3b82f6; opacity: 0; transition: opacity 0.3s ease;';
        container.appendChild(toast);

        setTimeout(() => { toast.style.opacity = '1'; }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
