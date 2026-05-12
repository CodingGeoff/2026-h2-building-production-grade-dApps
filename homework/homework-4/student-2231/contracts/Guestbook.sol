// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Guestbook
 * @notice 一个极简的链上留言板, 用于演示 Homework 4 要求的全部操作:
 *         - 部署 (new)
 *         - 状态读取 (totalMessages / messageOf)
 *         - 状态更新 (sign)
 *         - 事件 (MessageSigned)
 *
 *         业务语义: 每个账户只能留一条话, 可以覆盖更新.
 */
contract Guestbook {
    struct Entry {
        string message;
        uint256 updatedAt;
    }

    mapping(address => Entry) private _entries;
    address[] private _signers; // 只第一次留言时入列
    mapping(address => bool) private _hasSigned;

    event MessageSigned(address indexed signer, string message, uint256 timestamp, bool firstTime);

    /// @notice 留言. 同一个地址再次调用会覆盖原内容 + 更新时间戳.
    function sign(string calldata message) external {
        require(bytes(message).length > 0, "Guestbook: empty message");
        require(bytes(message).length <= 280, "Guestbook: message too long");

        bool firstTime = !_hasSigned[msg.sender];
        if (firstTime) {
            _hasSigned[msg.sender] = true;
            _signers.push(msg.sender);
        }

        _entries[msg.sender] = Entry({ message: message, updatedAt: block.timestamp });
        emit MessageSigned(msg.sender, message, block.timestamp, firstTime);
    }

    /// @notice 查询总共有多少独立签名者
    function totalSigners() external view returns (uint256) {
        return _signers.length;
    }

    /// @notice 按索引遍历签名者 (方便前端 paginate)
    function signerAt(uint256 index) external view returns (address) {
        require(index < _signers.length, "Guestbook: index out of bounds");
        return _signers[index];
    }

    /// @notice 读取某个地址的留言
    function messageOf(address who) external view returns (string memory message, uint256 updatedAt) {
        Entry storage e = _entries[who];
        return (e.message, e.updatedAt);
    }

    /// @notice 判断某地址是否已留言
    function hasSigned(address who) external view returns (bool) {
        return _hasSigned[who];
    }
}
