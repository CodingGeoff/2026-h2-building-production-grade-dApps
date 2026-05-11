// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract SimpleStorage {
    uint256 private favoriteNumber;

    function store(uint256 _favoriteNumber) external {
        favoriteNumber = _favoriteNumber;
    }

    function retrieve() external view returns (uint256) {
        return favoriteNumber;
    }
}
