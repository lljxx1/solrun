
const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const syn = require('./syn');
const { parseAST } = require('./extract');
// const wasm = require('./syn/astexplorer_syn_bg.wasm');

async function gen(filename, opts) {
  const baseDir = process.cwd();
  const mainFile = path.resolve(baseDir, filename);
  const outFile = path.resolve(baseDir, path.basename(filename).replace('.rs', '.json'));
  const abiDefFile = path.resolve(baseDir, 'abi.json');
  // console.log("baseDir", baseDir, mainFile);
  const rustCode = fs.readFileSync(mainFile, 'utf-8');
  const wasm = WebAssembly.compile(fs.readFileSync(__dirname + '/syn/astexplorer_syn_bg.wasm'));
  await syn.init(wasm);
  const result = await syn.parseFile(rustCode);
  const parsedABI = parseAST(result);
  console.log(parsedABI);

  fs.writeFileSync(outFile, JSON.stringify(parsedABI, null, 2));

  if (fs.existsSync(abiDefFile)) {
    const abiContent = require(abiDefFile);
    abiContent.instructions = parsedABI.instructions;
    abiContent.genTime = Date.now();
    fs.writeFileSync(abiDefFile, JSON.stringify(abiContent, null, 2));
  }
}

program
  .argument("<filename>")
  // .option('-t, --title <honorific>', 'title to use before name')
  // .option('-d, --debug', 'display some debugging')
  .description("Generate ABI from Solana Contract")
  .action(async (filename, opts, command) => {
    try {
      await gen(filename, opts);
    } catch (e) {
      console.log("failed", e);
    }

    // console.log('clone command called', filename);
  });

program.parse();
