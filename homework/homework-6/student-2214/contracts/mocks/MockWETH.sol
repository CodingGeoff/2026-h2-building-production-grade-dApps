pragma solidity =0.6.6;

contract MockWETH {
    string public constant name = "Wrapped Ether";
    string public constant symbol = "WETH";
    uint8 public constant decimals = 18;
    uint public totalSupply;

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    event Approval(address indexed owner, address indexed spender, uint value);
    event Deposit(address indexed dst, uint wad);
    event Transfer(address indexed from, address indexed to, uint value);
    event Withdrawal(address indexed src, uint wad);

    receive() external payable {
        deposit();
    }

    /**
     * 用测试网络 ETH 铸成 WETH，模拟 Router 的 addLiquidityETH 和 swap ETH 路径。
     * 这里只保留 UniswapV2 需要的最小行为，避免 mock 本身盖过被测逻辑。
     */
    function deposit() public payable {
        balanceOf[msg.sender] = balanceOf[msg.sender] + msg.value;
        totalSupply = totalSupply + msg.value;
        emit Deposit(msg.sender, msg.value);
        emit Transfer(address(0), msg.sender, msg.value);
    }

    function withdraw(uint value) external {
        require(balanceOf[msg.sender] >= value, "MockWETH: insufficient balance");
        balanceOf[msg.sender] = balanceOf[msg.sender] - value;
        totalSupply = totalSupply - value;
        msg.sender.transfer(value);
        emit Withdrawal(msg.sender, value);
        emit Transfer(msg.sender, address(0), value);
    }

    function approve(address spender, uint value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        uint allowed = allowance[from][msg.sender];
        if (allowed != uint(-1)) {
            require(allowed >= value, "MockWETH: insufficient allowance");
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint value) private {
        require(balanceOf[from] >= value, "MockWETH: insufficient balance");
        balanceOf[from] = balanceOf[from] - value;
        balanceOf[to] = balanceOf[to] + value;
        emit Transfer(from, to, value);
    }
}
