const fs = require('fs');
const path = require('path');

// Define the folder path
const folderPath = path.join(__dirname, 'grok');

// Check if the folder exists
if (!fs.existsSync(folderPath)) {
  console.error(`Folder "${folderPath}" does not exist.`);
  process.exit(1);
}

// Read all files in the folder
fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error('Error reading the folder:', err);
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);

    // Check if the file has a .adoc.txt extension
    if (file.endsWith('.adoc.txt')) {
      const newFileName = file.replace('.adoc.txt', '.txt.adoc');
      const newFilePath = path.join(folderPath, newFileName);

      // Rename the file
      fs.rename(filePath, newFilePath, (err) => {
        if (err) {
          console.error(`Error renaming file "${file}":`, err);
        } else {
          console.log(`Renamed: "${file}" -> "${newFileName}"`);
        }
      });
    }
  });
});