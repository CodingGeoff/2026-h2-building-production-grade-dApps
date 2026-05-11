// contracts/uniswap/WETH.sol
// SPDX-License-Identifier: MIT
pragma solidity =0.5.16;

// ================================================================
// WETH (Wrapped ETH/DOT) 合约
//
// 原理：
// - 存入原生代币（ETH/DOT）→ 铸造等量 WETH
// - 销毁 WETH → 取出等量原生代币
//
// 为什么需要 WETH？
// Uniswap V2 的 pair 合约只处理 ERC20 代币
// 原生代币（ETH/DOT）不是 ERC20，所以需要先"包装"成 WETH
// ================================================================
contract WETH {
    string public name     = "Wrapped DOT";
    string public symbol   = "WDOT";
    uint8  public decimals = 18;

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);

    mapping (address => uint)                       public  balanceOf;
    mapping (address => mapping (address => uint))  public  allowance;

    // 存入原生代币，铸造 WETH
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // 取出原生代币，销毁 WETH
    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad);
        balanceOf[msg.sender] -= wad;
        msg.sender.transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint wad) public returns (bool) {
        require(balanceOf[src] >= wad);
        if (src != msg.sender && allowance[src][msg.sender] != uint(-1)) {
            require(allowance[src][msg.sender] >= wad);
            allowance[src][msg.sender] -= wad;
        }
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);
        return true;
    }


    // 0.5.x 语法的 fallback 函数
    function() external payable {
        deposit();
    }
}