
contract Test {
    
    event Log(string message);
    
    function main() external {
        for(uint8 i = 0; i < 250; i++) {
            emit Log("first");
        }   
    }   
}