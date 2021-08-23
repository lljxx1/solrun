contract Test {

  event Log(string);

  function main() external {
    uint256 tokenBalance = 0;
    emit Log("check Balance is  > 0");
    require(tokenBalance != 0, "Current No Balance");
    emit Log("balance > 0");
  }
}