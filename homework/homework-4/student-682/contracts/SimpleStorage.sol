// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleStorage {
    uint256 public value;

    event ValueChanged(uint256 newValue);

    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}
