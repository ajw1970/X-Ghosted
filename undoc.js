import { existsSync, promises as fsPromises } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { readdir, rename } = fsPromises;

// Define the folder path
const __dirname = dirname(fileURLToPath(import.meta.url));
const folderPath = join(__dirname, 'grok');

// Check if the folder exists
if (!existsSync(folderPath)) {
  console.error(`Folder "${folderPath}" does not exist.`);
  process.exit(1);
}

(async () => {
  try {
    // Read all files in the folder
    const files = await readdir(folderPath);

    for (const file of files) {
      const filePath = join(folderPath, file);

      // Check if the file has a .txt.adoc extension
      if (file.endsWith('.txt.adoc')) {
        const newFileName = file.replace('.txt.adoc', '.adoc.txt');
        const newFilePath = join(folderPath, newFileName);

        // Rename the file
        try {
          await rename(filePath, newFilePath);
          console.log(`Renamed: "${file}" -> "${newFileName}"`);
        } catch (err) {
          console.error(`Error renaming file "${file}":`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error reading the folder:', err);
  }
})();