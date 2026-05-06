// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPVM {
    function call(bytes calldata payload) external returns (bytes memory);
}

contract EVMToPVMCaller {
    address constant PVM_PRECOMPILE = 0x0000000000000000000000000000000000000901;
    
    event PVMCalled(address indexed pvmContract, bytes result);
    event PVMCallFailed(string reason);
    
    function callPVMContract(
        address pvmContract,
        bytes4 selector,
        bytes calldata params
    ) external returns (bytes memory) {
        bytes memory payload = abi.encodeWithSelector(
            selector,
            pvmContract,
            params
        );
        
        (bool success, bytes memory result) = PVM_PRECOMPILE.call(payload);
        
        if (success) {
            emit PVMCalled(pvmContract, result);
            return result;
        } else {
            emit PVMCallFailed("PVM call failed");
            revert("PVM call failed");
        }
    }
    
    function getPVMAddress() external pure returns (address) {
        return PVM_PRECOMPILE;
    }
}

contract EVMToEVMCrossChain {
    address constant EVM_PRECOMPILE = 0x0000000000000000000000000000000000000902;
    
    event EVMCrossCalled(address indexed target, bytes result);
    
    function callEVMContract(
        address target,
        bytes4 selector,
        bytes calldata params
    ) external payable returns (bytes memory) {
        bytes memory payload = abi.encodeWithSelector(selector, params);
        
        (bool success, bytes memory result) = EVM_PRECOMPILE.call{value: msg.value}(payload);
        
        require(success, "EVM cross-call failed");
        emit EVMCrossCalled(target, result);
        
        return result;
    }
}