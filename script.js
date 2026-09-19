// Global variable to store organized file categories for the ZIP export
let organizedStructure = {};

function organizeFiles() {
    const input = document.getElementById('fileInput').value;
    const outputDiv = document.getElementById('output');
    const downloadBtn = document.getElementById('downloadZipBtn');
    
    if (!input.trim()) {
        outputDiv.innerHTML = "Please enter at least one file name.";
        downloadBtn.style.display = 'none';
        return;
    }

    const files = input.split(',').map(f => f.trim()).filter(f => f.length > 0);
    let resultHTML = "<strong>Sorting Results:</strong><br>";
    
    // Reset structure mapping
    organizedStructure = {};
    
    files.forEach(file => {
        const parts = file.split('.');
        const ext = parts.length > 1 ? parts.pop().toUpperCase() : 'NO_EXTENSION';
        
        // Group files by category folder
        if (!organizedStructure[ext]) {
            organizedStructure[ext] = [];
        }
        organizedStructure[ext].push(file);

        resultHTML += `➔ ${file} &nbsp;&nbsp;📂 [/${ext}/]<br>`;
    });

    outputDiv.innerHTML = resultHTML;
    
    // Show download ZIP button once files are processed
    downloadBtn.style.display = 'block';
}

async function downloadZip() {
    const zip = new JSZip();
    
    // Create folders and put files into them based on categorization
    for (const [folderName, fileList] of Object.entries(organizedStructure)) {
        const folder = zip.folder(folderName);
        fileList.forEach(fileName => {
            // Add a placeholder text inside each generated file for demonstration
            folder.file(fileName, `This is an automated placeholder for ${fileName}`);
        });
    }

    // Generate the ZIP file and trigger download
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
        console.error('Error generating ZIP archive:', error);
        alert('Failed to generate ZIP archive.');
    }
}
