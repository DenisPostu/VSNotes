const vscode = require('vscode');
const path = require('path');
const fs = require('fs-extra');
const klaw = require('klaw');
const matter = require('gray-matter');

module.exports = function () {
  const config = vscode.workspace.getConfiguration('vsnotes');
  const noteFolder = config.get('defaultNotePath');

  const noteFolderLen = noteFolder.length;

  createTagIndex(noteFolder).then(tags => {
    vscode.window.showQuickPick(Object.keys(tags)).then(tag => {
      if (tag != null) {

        const shortPaths = tags[tag].map(function (item) {
          return item.slice(noteFolderLen + 1, item.length);
        })

        vscode.window.showQuickPick(shortPaths).then(chosenShortPath => {
          const fullpath = path.join(noteFolder, chosenShortPath)

          vscode.window.showTextDocument(vscode.Uri.file(fullpath)).then(file => {
            console.log('Opening file.');
          }, err => {
            console.error(err);
          })
        }, err => {
          console.error(err)
        })
      }
    }, err => {
      console.error(err)
    })
  })
}


// Given a folder path, traverse and find all markdown files.
// Open and grab tags from front matter.
function createTagIndex(noteFolderPath) {
  const config = vscode.workspace.getConfiguration('vsnotes');
  const ignorePattern = new RegExp(config.get('ignorePatterns')
    .map(function (pattern) { return '(' + pattern + ')' })
    .join('|'));
  return new Promise((resolve, reject) => {
    let tagIndex = {}

    klaw(noteFolderPath)
      .on('data', item => {
        const fileName = path.basename(item.path);
        if (!ignorePattern.test(fileName)) {
          fs.readFile(item.path).then(fileContents => {
            const parsedFrontMatter = matter(fileContents)
            if ('tags' in parsedFrontMatter.data) {
              for (let tag of parsedFrontMatter.data.tags) {
                if (tag in tagIndex) {
                  tagIndex[tag].push(item.path);
                } else {
                  tagIndex[tag] = [item.path];
                }
              }
            }
          }).catch(err => {
            console.error(err);
          })
        }
      })
      .on('error', (err, item) => {
        reject(err)
        console.error('Error while walking notes folder for tags: ', item, err);
      })
      .on('end', () => {
        console.log(tagIndex)
        resolve(tagIndex)
      })
  })
}