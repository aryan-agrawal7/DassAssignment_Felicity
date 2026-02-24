const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Fix cases where the string is wrapped in single quotes: '${import.meta.env...}/.../' 
            // Replace the leading single quote with a backtick
            content = content.replace(/'\$\{import\.meta\.env\.VITE_API_URL/g, '`${import.meta.env.VITE_API_URL');

            // We also need to fix the closing quote.
            // E.g., `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login'
            // Find what follows the variable all the way up to the closing single quote
            content = content.replace(/(\`\$\{import\.meta\.env\.VITE_API_URL[^}]+\}[^']*)'/g, '$1`');

            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Fixed template literals in all JSX files');
