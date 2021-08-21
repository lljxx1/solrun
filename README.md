# solrun
Command line tool for run solidity contract locally. based on [ethereumjs-vm](https://www.npmjs.com/package/ethereumjs-vm) and [soljson.js](https://github.com/ethereum/solc-bin)

- default solc complier version is `0.6.12`  

## Example
Let's take a look!

### test.sol
``` solidity
contract Coin {
    address public owner;
    mapping(address => uint) public balances;

    constructor(address miner) {
        owner = miner;
    }

    function mint(uint amount) external {
        balances[owner] += amount;
    }

    function balanceOf(address who) external view returns (uint) {
        return balances[who];
    }
}


contract Test {

    event Log(string);
    event Log(uint);

    string public state;
    Coin coin;
    address public coinerOwner;

    constructor() {
        state = "constructor";
        coinerOwner = address(0);
        coin = new Coin(coinerOwner);
    }

    // solrun will auto call this main function 
    function main() external {
        emit Log(state);
        if (2 > 1) emit Log("failed");
        emit Log("hello world");
        setState("set newSate");

        coin.mint(1000);
        uint balance = coin.balanceOf(coinerOwner);

        emit Log(balance);

        string memory curSate = getState();
        emit Log(
            string(
                abi.encodePacked("state:", curSate)
            )
        );
    }

    function setState(string memory newState) public {
        state = newState;
    }

    function getState() public view returns (string memory) {
        return state;
    }
}
```

### Run
``` shell
solrun test.sol
```

### Output
``` bash
Log(constructor)
Log(failed)
Log(hello world)
Log(1000)
Log(state:set newSate)
```

## Roadamp
- [x] Run contract  
- [ ] Support `import`  
- [ ] Call specify Contract and method
- [ ] Multiple method call
- [ ] Switch solc compiler vesion