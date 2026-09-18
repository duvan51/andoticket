const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const wwebjsDir = path.join(__dirname, 'node_modules', 'whatsapp-web.js');
if (fs.existsSync(wwebjsDir)) {
  console.log('Patching whatsapp-web.js files...');
  walkDir(wwebjsDir, (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace read access: obj._serialized to (obj._serialized || obj.$1)
      // We use a regex with a negative lookahead to avoid replacing assignments like obj._serialized = ...
      // We exclude parenthesis to avoid matching function arguments/parameters.
      const regex = /\b([a-zA-Z0-9_.]+)\._serialized(?!\s*=)\b/g;
      
      if (regex.test(content)) {
        console.log(`- Patching: ${filePath}`);
        // Reset regex index
        regex.lastIndex = 0;
        let newContent = content.replace(regex, (match, p1) => {
          return `(${p1}._serialized || ${p1}.$1)`;
        });
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    }
  });

  const clientPath = path.join(wwebjsDir, 'src', 'Client.js');
  if (fs.existsSync(clientPath)) {
    let clientContent = fs.readFileSync(clientPath, 'utf8');
    if (clientContent.includes('await this.inject();') && !clientContent.includes('try { await this.inject(); } catch')) {
      clientContent = clientContent.replace(
        /await\s+this\.inject\(\);/g,
        'try { await this.inject(); } catch (err) {}'
      );
      fs.writeFileSync(clientPath, clientContent, 'utf8');
      console.log('- Patched Client.js inject() calls with try/catch');
    }
  }

  console.log('whatsapp-web.js patched successfully!');
} else {
  console.log('whatsapp-web.js not found in node_modules.');
}
