# Solidity Run



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
Account:  0xbe862ad9abfe6f22bcb087716c7d89a26051f74c
Contract:  0x61de9dc6f6cff1df2809480882cfd3c2364b28f7
Log(failed)
Log(hello world)
Test(Abc, ad)
Test(now state is, fuck)
```