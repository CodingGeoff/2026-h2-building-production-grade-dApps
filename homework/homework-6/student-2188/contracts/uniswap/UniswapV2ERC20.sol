// contracts/uniswap/UniswapV2ERC20.sol
// SPDX-License-Identifier: MIT
pragma solidity =0.5.16;

// ================================================================
// Uniswap V2 ERC20 - LP Token 基础合约
// LP Token 是"流动性证明"，当你往池子里加钱时，你会收到 LP Token
// 当你想取钱时，把 LP Token 还回去就行
// ================================================================

contract UniswapV2ERC20 {
    string  public constant name     = 'Uniswap V2';
    string  public constant symbol   = 'UNI-V2';
    uint8   public constant decimals = 18;

    uint    public totalSupply;
    mapping(address => uint)                      public balanceOf;
    mapping(address => mapping(address => uint))  public allowance;

    // EIP-2612 permit 所需的 domain separator
    bytes32 public DOMAIN_SEPARATOR;

    // EIP-712 类型哈希 - permit 函数的函数签名哈希
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
    bytes32 public constant PERMIT_TYPEHASH = 
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    mapping(address => uint) public nonces;

    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    constructor() public {
        // 计算 EIP-712 domain separator
        // 这用于 permit 签名验证，防止跨链重放攻击
        uint chainId;
        assembly {
            chainId := chainid
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    // 内部铸造 LP Token（只有 Pair 合约可以调用）
    function _mint(address to, uint value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    // 内部销毁 LP Token（取回流动性时调用）
    function _burn(address from, uint value) internal {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint value) private {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        if (allowance[from][msg.sender] != uint(-1)) {
            allowance[from][msg.sender] -= value;
        }
        _transfer(from, to, value);
        return true;
    }

    // EIP-2612 permit：允许通过签名授权，无需 approve 交易
    function permit(
        address owner,
        address spender,
        uint value,
        uint deadline,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        require(deadline >= block.timestamp, 'UniswapV2: EXPIRED');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'UniswapV2: INVALID_SIGNATURE');
        _approve(owner, spender, value);
    }
}