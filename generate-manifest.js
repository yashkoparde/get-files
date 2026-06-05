import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

function getFilesRecursively(dir, baseDir = publicDir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else if (stat && stat.isFile()) {
      const relativePath = path.relative(baseDir, filePath);
      const normalizedPath = relativePath.replace(/\\/g, '/');
      if (file !== 'index.html' && file !== 'vite.svg' && file !== 'files.json') {
        results.push(normalizedPath);
      }
    }
  });
  return results;
}

const files = getFilesRecursively(publicDir);

fs.writeFileSync(path.join(publicDir, 'files.json'), JSON.stringify({ files }));
console.log('Generated public/files.json with:', files);
