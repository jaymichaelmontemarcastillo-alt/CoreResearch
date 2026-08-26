const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory()
        ? walkSync(dirFile, filelist)
        : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EPERM') console.log(`Cannot read ${dirFile}`);
    }
  });
  return filelist;
};

const srcDir = path.join(__dirname, 'src');
const files = walkSync(srcDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts'));

let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace font-bold with font-medium in classNames when associated with large text
  // e.g. "text-xl font-bold" -> "text-xl font-medium"
  // "font-bold text-2xl" -> "font-medium text-2xl"
  
  // We'll replace all font-bold and font-extrabold with font-medium in any string containing large text sizes.
  // Actually, standard heading replacements:
  content = content.replace(/(text-(lg|xl|2xl|3xl|4xl|5xl|6xl)[^"']*)font-bold/g, '$1font-medium');
  content = content.replace(/font-bold([^"']*text-(lg|xl|2xl|3xl|4xl|5xl|6xl))/g, 'font-medium$1');
  
  content = content.replace(/(text-(lg|xl|2xl|3xl|4xl|5xl|6xl)[^"']*)font-extrabold/g, '$1font-medium');
  content = content.replace(/font-extrabold([^"']*text-(lg|xl|2xl|3xl|4xl|5xl|6xl))/g, 'font-medium$1');

  // Also replace font-bold with font-medium where it's a page title or section title (often text-lg or larger)
  // Let's just do a simpler pass. The user said "all page title and large and bold font size"
  // What about just font-semibold instead of font-medium? Google Classroom usually uses font-medium for standard headings.
  // We'll use font-medium as it is noticeably thinner than bold.
  
  // What if there is just font-bold in a heading without size class?
  // Let's just replace all font-bold with font-medium to be safe if the user wants all bold fonts thinner? 
  // "all page title and large and bold font size, make them all thinner"
  
  // Let's just stick to the regex replacements for large texts.
  // Oh, wait, the user's screenshot has some normal text that isn't bold. 
  // But wait! Page headers could be just "text-base font-bold", which is technically bold but not "large".
  // Let's also do text-base.
  content = content.replace(/(text-(base|lg|xl|2xl|3xl|4xl|5xl|6xl)[^"']*)font-bold/g, '$1font-medium');
  content = content.replace(/font-bold([^"']*text-(base|lg|xl|2xl|3xl|4xl|5xl|6xl))/g, 'font-medium$1');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
}

console.log(`Updated fonts in ${changedCount} files.`);
