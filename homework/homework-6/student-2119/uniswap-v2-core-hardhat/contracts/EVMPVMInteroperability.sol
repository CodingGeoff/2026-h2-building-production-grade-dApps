pragma solidity =0.5.16;

/**
 * Minimal EVM ↔ PVM bridge illustration for coursework.
 * PVM is modeled as a sibling domain reached via an off-chain relay listening to events.
 * `bridgeGateway` is the address allowed to finalize `bridgeFromPVM` (simulating relay proofs).
 */

contract EVMToPVMBridge {
    address public bridgeGateway;
    address public pvmReceiver;
    uint256 public messageCounter;

    address public trustedSwapRouter;
    address private routerSetter;

    mapping(bytes32 => CrossChainMessage) public messages;
    mapping(address => uint256) public userBalances;

    struct CrossChainMessage {
        address sender;
        address recipient;
        uint256 amount;
        bytes data;
        uint256 timestamp;
        bool executed;
    }

    event MessageSentToPVM(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );

    event MessageReceivedFromPVM(
        bytes32 indexed messageId,
        address indexed sender,
        uint256 amount
    );

    event BridgeTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        string direction
    );

    constructor(address _bridgeGateway, address _pvmReceiver) public {
        bridgeGateway = _bridgeGateway;
        pvmReceiver = _pvmReceiver;
        routerSetter = msg.sender;
    }

    function setPVMReceiver(address _pvmReceiver) external {
        require(_pvmReceiver != address(0), "Invalid address");
        pvmReceiver = _pvmReceiver;
    }

    /** One-time wiring so CrossChainSwap can debit the initiator's bridge balance. */
    function setTrustedSwapRouter(address _router) external {
        require(msg.sender == routerSetter, "!setter");
        require(trustedSwapRouter == address(0), "already set");
        trustedSwapRouter = _router;
    }

    /**
     * User-initiated lock toward PVM (deducts msg.sender balance).
     */
    function bridgeTowardsPVM(
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes32) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");

        userBalances[msg.sender] -= amount;

        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, recipient, amount, block.timestamp, messageCounter++)
        );

        CrossChainMessage memory message = CrossChainMessage({
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            data: data,
            timestamp: block.timestamp,
            executed: false
        });

        messages[messageId] = message;

        emit MessageSentToPVM(messageId, msg.sender, recipient, amount);
        return messageId;
    }

    /**
     * Router-initiated lock: deducts `payer` (typically swap initiator) balance.
     */
    function bridgeTowardsPVMAs(
        address payer,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes32) {
        require(msg.sender == trustedSwapRouter, "!router");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[payer] >= amount, "Insufficient balance");

        userBalances[payer] -= amount;

        bytes32 messageId = keccak256(
            abi.encodePacked(payer, recipient, amount, block.timestamp, messageCounter++)
        );

        CrossChainMessage memory message = CrossChainMessage({
            sender: payer,
            recipient: recipient,
            amount: amount,
            data: data,
            timestamp: block.timestamp,
            executed: false
        });

        messages[messageId] = message;

        emit MessageSentToPVM(messageId, payer, recipient, amount);
        return messageId;
    }

    function bridgeFromPVM(
        bytes32 messageId,
        address sender,
        address recipient,
        uint256 amount,
        bytes calldata /* data */
    ) external {
        require(msg.sender == bridgeGateway, "Only bridge gateway can call");
        require(!messages[messageId].executed, "Message already executed");

        messages[messageId].executed = true;

        userBalances[recipient] += amount;

        emit MessageReceivedFromPVM(messageId, sender, amount);
        emit BridgeTransfer(sender, recipient, amount, "PVM->EVM");
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        userBalances[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
    }

    function getBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    function getMessageStatus(bytes32 messageId) external view returns (bool) {
        return messages[messageId].executed;
    }

    function getMessage(bytes32 messageId)
        external
        view
        returns (
            address sender,
            address recipient,
            uint256 amount,
            uint256 timestamp,
            bool executed
        )
    {
        CrossChainMessage memory message = messages[messageId];
        return (message.sender, message.recipient, message.amount, message.timestamp, message.executed);
    }
}

contract PVMBridgeReceiver {
    address public evmBridge;
    address public bridgeGateway;

    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public balances;

    event TokensReceived(
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );

    event TokensSent(
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );

    constructor(address _evmBridge, address _bridgeGateway) public {
        evmBridge = _evmBridge;
        bridgeGateway = _bridgeGateway;
    }

    function handleCrossChainMessage(
        address sender,
        address recipient,
        uint256 amount,
        bytes calldata /* data */
    ) external {
        require(msg.sender == bridgeGateway, "Only bridge gateway can call");

        bytes32 messageId = keccak256(
            abi.encodePacked(sender, recipient, amount, block.timestamp)
        );

        require(!processedMessages[messageId], "Message already processed");

        processedMessages[messageId] = true;

        balances[recipient] += amount;

        emit TokensReceived(sender, recipient, amount);
    }

    function sendBackToEVM(
        address recipient,
        uint256 amount,
        bytes calldata /* data */
    ) external returns (bytes32) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;

        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, recipient, amount, block.timestamp)
        );

        emit TokensSent(msg.sender, recipient, amount);
        return messageId;
    }

    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function isMessageProcessed(bytes32 messageId) external view returns (bool) {
        return processedMessages[messageId];
    }
}

contract CrossChainSwap {
    EVMToPVMBridge public evmBridge;
    PVMBridgeReceiver public pvmReceiver;

    struct SwapOrder {
        address initiator;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
        bool completed;
    }

    mapping(bytes32 => SwapOrder) public swapOrders;

    event SwapInitiated(
        bytes32 indexed orderId,
        address indexed initiator,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    );

    event SwapCompleted(
        bytes32 indexed orderId,
        uint256 amountOut
    );

    constructor(address _evmBridge, address _pvmReceiver) public {
        evmBridge = EVMToPVMBridge(_evmBridge);
        pvmReceiver = PVMBridgeReceiver(_pvmReceiver);
    }

    function initiateSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (bytes32) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(block.timestamp <= deadline, "Swap expired");

        bytes32 orderId = keccak256(
            abi.encodePacked(msg.sender, tokenIn, tokenOut, amountIn, block.timestamp)
        );

        SwapOrder memory order = SwapOrder({
            initiator: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            deadline: deadline,
            completed: false
        });

        swapOrders[orderId] = order;

        evmBridge.bridgeTowardsPVMAs(
            msg.sender,
            address(pvmReceiver),
            amountIn,
            abi.encode(orderId, minAmountOut)
        );

        emit SwapInitiated(orderId, msg.sender, tokenIn, tokenOut, amountIn);
        return orderId;
    }

    function completeSwap(
        bytes32 orderId,
        uint256 amountOut
    ) external {
        require(!swapOrders[orderId].completed, "Swap already completed");
        require(amountOut > 0, "Invalid amount out");

        SwapOrder storage order = swapOrders[orderId];
        order.completed = true;

        emit SwapCompleted(orderId, amountOut);

        pvmReceiver.sendBackToEVM(
            order.initiator,
            amountOut,
            abi.encode(orderId)
        );
    }

    function getSwapOrder(bytes32 orderId)
        external
        view
        returns (
            address initiator,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            bool completed
        )
    {
        SwapOrder memory order = swapOrders[orderId];
        return (order.initiator, order.tokenIn, order.tokenOut, order.amountIn, order.completed);
    }
}
