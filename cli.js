
const wrapper = require('solc/wrapper');
const soljson = require('./soljson.js');
const solc = wrapper(soljson);
const { Account, Address, BN } = require('ethereumjs-util');
const { defaultAbiCoder, Interface } = require('@ethersproject/abi');
const AbiCoder = defaultAbiCoder;
const VM = require('@ethereumjs/vm').default;
const { Transaction } = require('@ethereumjs/tx');
const { program } = require('commander');

// const mainFile = 'test.sol';

async function complieContract(sources, ) {
  const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };
  
  function findImports(path) {
    if (path === 'lib.sol')
      return {
        contents:
          'library L { function f() internal returns (uint) { return 7; } }'
      };
    else return { error: 'File not found' };
  }
  
  // New syntax (supported from 0.5.12, mandatory from 0.6.0)
  var output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );
  return output;
}

async function getAccountNonce(vm, accountPrivateKey) {
  const address = Address.fromPrivateKey(accountPrivateKey)
  const account = await vm.stateManager.getAccount(address)
  return account.nonce
}

async function deployContract(vm, senderPrivateKey, deploymentBytecode) {
  const params = AbiCoder.encode([], [])
  const txData = {
    value: 0,
    gasLimit: 2000000, // We assume that 2M is enough,
    gasPrice: 1,
    data: '0x' + deploymentBytecode.toString('hex') + params.slice(2),
    nonce: await getAccountNonce(vm, senderPrivateKey),
  }

  const tx = Transaction.fromTxData(txData).sign(senderPrivateKey)
  const deploymentResult = await vm.runTx({ tx })

  if (deploymentResult.execResult.exceptionError) {
    throw deploymentResult.execResult.exceptionError
  }

  return deploymentResult.createdAddress
}

async function runCode(contract) {
  // console.log('contract', contract)
  const bytecode = contract.evm.bytecode.object;
  // console.log(output.contracts[mainFile].Main.evm.bytecode.object)
  const accountPk = Buffer.from(
    'e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109',
    'hex',
  )

  const accountAddress = Address.fromPrivateKey(accountPk)
  console.log('Account: ', accountAddress.toString())
  const acctData = {
    nonce: 0,
    balance: new BN(100).pow(new BN(18)), // 1 eth
  }

  const account = Account.fromAccountData(acctData)
  const vm = new VM()

  // newContract
  // vm.on('beforeMessage', function (data) {
  //   console.log(data)
  // })

  await vm.stateManager.putAccount(accountAddress, account)
  const contractAddress = await deployContract(vm, accountPk, bytecode)
  // console.log(contractAddress);

  vm.on('afterMessage', function (data) {
    // console.log('afterMessage', data)
  })

  const caller = accountAddress;

  const params = AbiCoder.encode([], []);
  const sigHash = new Interface(['function run()']).getSighash('run')
  const txData = {
    to: contractAddress,
    value: 0,
    gasLimit: 2000000, // We assume that 2M is enough,
    gasPrice: 1,
    data: sigHash + params.slice(2),
    nonce: await getAccountNonce(vm, accountPk),
  }

  const tx = Transaction.fromTxData(txData).sign(accountPk)
  const runResult = await vm.runTx({ tx })

  if (runResult.execResult.exceptionError) {
    throw runResult.execResult.exceptionError
  }

  // const results = AbiCoder.decode(['string'], runResult.execResult.returnValue)
  // return results[0]
  console.log(runResult.execResult.logs.map(_ => {

    return {
      account: Address.from(_[0]),
    }
  }))
}

// const bytecode = output.contracts[mainFile].Main.evm.bytecode.object;
// runCode(output.contracts[mainFile].Main);
// console.log(VM)


const fs = require('fs');
const path = require('path');

async function runContract(filename, opts) {

  const sources = {}
  const baseDir = process.cwd();
  const countractFile = path.resolve(baseDir, filename)
  const runCountractName = opts.contract || 'Main';

  console.log('baseDir', baseDir, countractFile)
  // const mainFile = pro
  sources[filename] = {
    content: fs.readFileSync(countractFile).toString('utf8')
  }
  const output = await complieContract(sources);
  const allContractsInFile = output.contracts[filename];
  const conrtactData = allContractsInFile[runCountractName];
  if (conrtactData) {
    // console.log(sources, output);
    runCode(conrtactData);
  } else {
    throw new Error('countract not found');
  }
}

program
  .argument('<filename>')
  .option('-t, --title <honorific>', 'title to use before name')
  .option('-d, --debug', 'display some debugging')
  .description('Run Solidity Contractor')
  .action(async (filename, opts, command) => {
    await runContract(filename, opts);
    // console.log('clone command called', filename);
  });



  program.parse();