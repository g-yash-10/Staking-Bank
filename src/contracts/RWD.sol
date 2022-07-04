pragma solidity ^0.5.0;

contract RWD
{
    string public name = 'Reward Token';
    string public symbol = 'RWD';
    uint256 public totalSupply = 1000000000000000000000000; //1 million tokens
    unit8 public decimals = 18;

    event Transfer(
        address indexed _from,
        address indexed _to,
        uint _value
    );
    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint _value
    );

    mapping(address => uint256) public balanceOf;
   mapping(address=> mapping(address => uint256)) public allowance;

    constructor() public {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address _to, uint _value) public return (bool success)
    {
        require(balanceOf[msg.sender] <= _value);
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(_to, _value);
        return true;
    }

    function approve(address _spender, uint _value) public return (bool success){
        allowance[msg.sender][_spender] = _value;
        emit Approve(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)
    {
        require(_value <= balanceOf[_from]);
        require(_value <= allownace[msg.sender][_from]);
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;

        allowance[msg.sender][_from] -= value;
        emit Transfer(_from, _to, _value);

        return true;
    }
}