function organizeFiles() {
    const input = document.getElementById('fileInput').value;
    const outputDiv = document.getElementById('output');
    
    if (!input.trim()) {
        outputDiv.innerHTML = "Будь ласка, введіть хоча б одне ім'я файлу.";
        return;
    }

    const files = input.split(',').map(f => f.trim()).filter(f => f.length > 0);
    let resultHTML = "<strong>Результат сортування:</strong><br>";
    
    files.forEach(file => {
        const parts = file.split('.');
        const ext = parts.length > 1 ? parts.pop().toUpperCase() : 'NO_EXTENSION';
        resultHTML += `➔ ${file} &nbsp;&nbsp;📂 [/${ext}/]<br>`;
    });

    outputDiv.innerHTML = resultHTML;
}
