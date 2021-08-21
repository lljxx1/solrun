
contract Test {
    
    event Log(string);

    string public state;

    constructor() {
        state = "constructor";
    }

    // solrun will auto call this main function 
    function main() external {
        emit Log(state);
        if (2 > 1) emit Log("failed");
        emit Log("hello world");
        setState("set newSate");
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