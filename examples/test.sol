
contract Test {

    event Log(string);
    event Test(string, string);

    string public state;

    constructor() {
        state = "constructor";
    }

    function main() external {
        emit Log(state);
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