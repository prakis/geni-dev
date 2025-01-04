
const gemini  = require('./gemini.js');

function geniDev() {
    return "hello NPM"
  }
  
async function main(){
  //console.log('hello geni');
  //console.log(gemini.testcall());

  // take user question from the prompt
  const commandArgsArray = process.argv.slice(2)
  const EMPTY_SPACE = ' ';
  const commandArgsAsString = commandArgsArray.join(EMPTY_SPACE);
  const addMakeItSmaller = "Give give me only the commands, don't explain. " + commandArgsAsString
  //const addMakeItSmaller = "Give me only commands, dont want explaination.";

  //console.log('Question:', commandArgsAsString);
  var answer = await gemini.askGemini(addMakeItSmaller);
  console.log(answer);
}  

main();

module.exports = geniDev