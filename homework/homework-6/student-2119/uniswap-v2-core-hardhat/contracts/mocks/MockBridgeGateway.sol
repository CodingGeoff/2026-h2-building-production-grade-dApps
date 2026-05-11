pragma solidity =0.5.16;

contract MockBridgeGateway {
    mapping(bytes32 => bool) public messagesSent;
    mapping(bytes32 => bool) public messagesReceived;

    event MessageSent(bytes32 indexed messageId, address indexed destination, bytes payload);
    event MessageReceived(bytes32 indexed messageId, address indexed source, bytes payload);

    function sendMessage(
        address destinationAddress,
        bytes memory payload,
        uint256 /* gasLimit */
    ) public returns (bytes32) {
        require(destinationAddress != address(0), "Invalid destination");
        require(payload.length > 0, "Empty payload");

        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, destinationAddress, payload, block.timestamp)
        );

        messagesSent[messageId] = true;

        emit MessageSent(messageId, destinationAddress, payload);
        return messageId;
    }

    function receivedMessage(bytes32 messageId) public view returns (bool) {
        return messagesReceived[messageId];
    }

    function mockReceiveMessage(bytes32 messageId) public {
        require(messagesSent[messageId], "Message not sent");
        messagesReceived[messageId] = true;
        emit MessageReceived(messageId, msg.sender, "0x");
    }
}
