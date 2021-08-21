# solrun
Command line tool for run solidity contract locally. based on [ethereumjs-vm](https://www.npmjs.com/package/ethereumjs-vm) and [soljson.js](https://github.com/ethereum/solc-bin)

`test.sol`
``` solidity
contract Main {
    event Log(string);
    event Test(string, string);

    string public state;

    function run() external {
        if (2 > 1) emit Log("failed");
        emit Log("hello world");
        emit Test("Abc", "ad");
        state = "fuck";
        string memory curSate = getState();
        emit Test("now state is", curSate);
    }

    function getState() public view returns (string memory) {
        return state;
    }
}
```

``` shell
solrun test.sol
```

Output:
``` bash
Log(failed)
Log(hello world)
Test(Abc, ad)
Test(now state is, fuck)
```