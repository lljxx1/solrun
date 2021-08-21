const wrapper = require("solc/wrapper");
const soljson = require("./soljson.js");
const solc = wrapper(soljson);
const { Account, Address, BN, keccak256 } = require("ethereumjs-util");
const { defaultAbiCoder, Interface } = require("@ethersproject/abi");
const AbiCoder = defaultAbiCoder;
const VM = require("@ethereumjs/vm").default;
const { Transaction } = require("@ethereumjs/tx");
const { program } = require("commander");

// const mainFile = 'test.sol';

async function complieContract(sources) {
  const input = {
    language: "Solidity",
    sources: sources,
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  };

  function findImports(path) {
    if (path === "lib.sol")
      return {
        contents:
          "library L { function f() internal returns (uint) { return 7; } }",
      };
    else return { error: "File not found" };
  }

  // New syntax (supported from 0.5.12, mandatory from 0.6.0)
  var output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );


  return output;
}

async function getAccountNonce(vm, accountPrivateKey) {
  const address = Address.fromPrivateKey(accountPrivateKey);
  const account = await vm.stateManager.getAccount(address);
  return account.nonce;
}

async function deployContract(vm, senderPrivateKey, deploymentBytecode) {
  const params = AbiCoder.encode([], []);
  const txData = {
    value: 0,
    gasLimit: 2000000, // We assume that 2M is enough,
    gasPrice: 1,
    data: "0x" + deploymentBytecode.toString("hex") + params.slice(2),
    nonce: await getAccountNonce(vm, senderPrivateKey),
  };

  const tx = Transaction.fromTxData(txData).sign(senderPrivateKey);
  const deploymentResult = await vm.runTx({ tx });

  if (deploymentResult.execResult.exceptionError) {
    throw deploymentResult.execResult.exceptionError;
  }

  return deploymentResult.createdAddress;
}

async function runCode(contract) {
  // console.log('contract', contract)
  const bytecode = contract.evm.bytecode.object;
  // console.log(output.contracts[mainFile].Main.evm.bytecode.object)
  const accountPk = Buffer.from(
    "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
    "hex"
  );

  const accountAddress = Address.fromPrivateKey(accountPk);
  // console.log('Account: ', accountAddress.toString())
  const acctData = {
    nonce: 0,
    balance: new BN(100).pow(new BN(18)), // 1 eth
  };

  const account = Account.fromAccountData(acctData);
  const vm = new VM();

  // newContract
  vm.on('error', function (er) {
    console.log('vm.error', er)
  })

  await vm.stateManager.putAccount(accountAddress, account);
  const contractAddress = await deployContract(vm, accountPk, bytecode);
  //  console.log("Contract: ", contractAddress.toString());

  vm.on("afterMessage", function (data) {
    // console.log('afterMessage', data)
  });

  const caller = accountAddress;

  const params = AbiCoder.encode([], []);
  const sigHash = new Interface(["function main()"]).getSighash("main");
  const txData = {
    to: contractAddress,
    value: 0,
    gasLimit: 2000000, // We assume that 2M is enough,
    gasPrice: 1,
    data: sigHash + params.slice(2),
    nonce: await getAccountNonce(vm, accountPk),
  };

  const tx = Transaction.fromTxData(txData).sign(accountPk);
  const runResult = await vm.runTx({ tx });

  if (runResult.execResult.exceptionError) {
    throw runResult.execResult.exceptionError;
  }

  // const results = AbiCoder.decode(['string'], runResult.execResult.returnValue)
  // return results[0]
  const eventABI = contract.abi
    .filter((_) => _.type == "event")
    .map((_) => {
      _.types = _.inputs.map((c) => c.type);
      const func = _.inputs.map((c) => c.type).join(",");
      const fn = `${_.name}(${func})`;
      _.uid = keccak256(Buffer.from(fn)).toString("hex");
      _.fnc = fn;
      return _;
    });

  // console.log("eventABI", eventABI);
  runResult.execResult.logs = runResult.execResult.logs.map((_) => {
    const [to, topics, data] = _;
    let tps = topics.map((_) => _.toString("hex"));
    const matchEvent = eventABI.filter((_) => tps.indexOf(_.uid) > -1)[0];
    const parsed = AbiCoder.decode(matchEvent.types, data);
    return {
      event: matchEvent,
      to: new Address(to).toString(),
      topics: tps,
      data: parsed,
      log: [matchEvent.name, "(", parsed.map(_ => {
        return _.toString();
      }).join(", "), ")"].join(""),
    };
  });

  runResult.execResult.logs.forEach((l) =>
    // console.log(l.log, l.event.uid, l.topics)
    console.log(l.log)
  );
}

const fs = require("fs");
const path = require("path");

async function runContract(filename, opts) {
  const sources = {};
  const baseDir = process.cwd();
  const countractFile = path.resolve(baseDir, filename);
  // console.log("baseDir", baseDir, countractFile);
  // const mainFile = pro
  sources[filename] = {
    content: fs.readFileSync(countractFile).toString("utf8"),
  };

  let output;
  try {
    output = await complieContract(sources);
  } catch (e) {
    process.exit();
  }

  if (!output.contracts) {
    console.log(
      output.errors
        .filter((_) => _.severity == "error")
        .forEach((_) => console.log(_.formattedMessage))
    );
    process.exit();
  }

  const allContractsInFile = output.contracts[filename];
  const inFileConstracts = Object.keys(allContractsInFile);
  let runCountractName =
    opts.contract ||
    (inFileConstracts.length == 1 ? inFileConstracts[0] : "Main");

  if(!allContractsInFile[runCountractName]) {
    inFileConstracts.forEach(contractName => {
      const currentContract = allContractsInFile[contractName];
      const { methodIdentifiers } = currentContract.evm;
      // find has mian
      if (methodIdentifiers["main()"]) {
        runCountractName = contractName;
      }
    })
  }

  const conrtactData = allContractsInFile[runCountractName];
  if (conrtactData) {
    // console.log(sources, output);
    runCode(conrtactData);
  } else {
    throw new Error("countract not found");
  }
}

program
  .argument("<filename>")
  // .option('-t, --title <honorific>', 'title to use before name')
  // .option('-d, --debug', 'display some debugging')
  .description("Run Solidity Contractor")
  .action(async (filename, opts, command) => {
    try {
      await runContract(filename, opts);
    } catch (e) {
      console.log("failed", e.toString());
    }

    // console.log('clone command called', filename);
  });

program.parse();
