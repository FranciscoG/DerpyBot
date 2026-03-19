const marked = require('marked.esm.js');
const fs = require('fs');

function updateIndex() {
  const index = fs.readFileSync('./index.tmpl', 'utf8');
  const commands = fs.readFileSync('./COMMANDS.md', 'utf8');
  const converted = marked(commands);
  const newIndex = index.replace("%%MARKDOWN%%", converted);

  fs.writeFile("./index.html", newIndex, function (err) {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });
}

const currentTask = process.argv[2];

if (currentTask === "watch") {
  fs.watchFile('./COMMANDS.md', (curr, prev) => {
    updateIndex();
  });
} else {
  updateIndex();
}

