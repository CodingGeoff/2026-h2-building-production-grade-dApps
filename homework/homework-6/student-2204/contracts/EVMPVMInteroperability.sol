pragma solidity =0.5.16;

/**
 * EVM-PVM (Programmable Virtual Machine) Interoperability Example
 * This contract demonstrates how to enable cross-chain communication
 * between EVM chains (like Ethereum, Polygon) and PVM chains (like Avalanche C-Chain)
 */

interface IBridgeGateway {
    function sendMessage(
        address destinationAddress,
        bytes calldata payload,
        uint256 gasLimit
    ) external returns (bytes32 messageId);

    function receivedMessage(bytes32 messageId) external view returns (bool);
}

interface IPVMReceiver {
    function handleCrossChainMessage(
        address sourceChain,
        address sourceAddress,
        bytes calldata payload
    ) external;
}

contract EVMToPVMBridge {
    address public bridgeGateway;
    address public pvmReceiver;
    uint256 public messageCounter;

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
    }

    function setPVMReceiver(address _pvmReceiver) external {
        require(_pvmReceiver != address(0), "Invalid address");
        pvmReceiver = _pvmReceiver;
    }

    /**
     * Send assets from EVM to PVM
     */
    function bridgeTowardsPVM(
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes32) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        // Lock/burn tokens in EVM
        userBalances[msg.sender] -= amount;
        require(userBalances[msg.sender] == 0 || userBalances[msg.sender] > 0, "Underflow");

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

        // Emit event to signal cross-chain message
        // In production, a bridge service would listen to this and relay it
        emit MessageSentToPVM(messageId, msg.sender, recipient, amount);
        return messageId;
    }

    /**
     * Receive assets from PVM to EVM
     */
    function bridgeFromPVM(
        bytes32 messageId,
        address sender,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external {
        require(msg.sender == bridgeGateway, "Only bridge gateway can call");
        require(!messages[messageId].executed, "Message already executed");

        // Mark as executed
        messages[messageId].executed = true;

        // Unlock/mint tokens in EVM
        userBalances[recipient] += amount;

        emit MessageReceivedFromPVM(messageId, sender, amount);
        emit BridgeTransfer(sender, recipient, amount, "PVM->EVM");
    }

    /**
     * Deposit funds to bridge
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        userBalances[msg.sender] += amount;
    }

    /**
     * Withdraw funds from bridge
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
    }

    /**
     * Get user balance
     */
    function getBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    /**
     * Get message status
     */
    function getMessageStatus(bytes32 messageId) external view returns (bool) {
        return messages[messageId].executed;
    }

    /**
     * Get message details
     */
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

/**
 * PVM-side receiver contract that handles incoming messages from EVM
 */
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

    /**
     * Handle cross-chain message from EVM
     */
    function handleCrossChainMessage(
        address sender,
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external {
        require(msg.sender == bridgeGateway, "Only bridge gateway can call");

        bytes32 messageId = keccak256(
            abi.encodePacked(sender, recipient, amount, block.timestamp)
        );

        require(!processedMessages[messageId], "Message already processed");

        processedMessages[messageId] = true;

        // Mint or transfer tokens on PVM
        balances[recipient] += amount;

        emit TokensReceived(sender, recipient, amount);

        // Optional: send callback to EVM
        if (data.length > 0) {
            _executeCallbackData(sender, data);
        }
    }

    /**
     * Send tokens from PVM back to EVM
     */
    function sendBackToEVM(
        address recipient,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes32) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;

        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, recipient, amount, block.timestamp)
        );

        // Emit event to signal message back to EVM
        // In production, bridge service listens and relays this
        emit TokensSent(msg.sender, recipient, amount);
        return messageId;
    }

    /**
     * Execute additional callback data
     */
    function _executeCallbackData(address sender, bytes memory data) private {
        // This is where you would handle any additional logic
        // based on the data passed from EVM
        // For example: trigger smart contracts, update state, etc.
    }

    /**
     * Get user balance on PVM
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    /**
     * Check if message has been processed
     */
    function isMessageProcessed(bytes32 messageId) external view returns (bool) {
        return processedMessages[messageId];
    }
}

/**
 * Advanced EVM-PVM interoperability with swap capability
 */
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

    /**
     * Initiate cross-chain swap: EVM token -> PVM token
     */
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

        // Bridge tokens to PVM for swap
        evmBridge.bridgeTowardsPVM(
            address(pvmReceiver),
            amountIn,
            abi.encode(orderId, minAmountOut)
        );

        emit SwapInitiated(orderId, msg.sender, tokenIn, tokenOut, amountIn);
        return orderId;
    }

    /**
     * Complete swap and return result to EVM
     */
    function completeSwap(
        bytes32 orderId,
        uint256 amountOut
    ) external {
        require(!swapOrders[orderId].completed, "Swap already completed");
        require(amountOut > 0, "Invalid amount out");

        SwapOrder storage order = swapOrders[orderId];
        order.completed = true;

        emit SwapCompleted(orderId, amountOut);

        // Bridge result back to EVM
        pvmReceiver.sendBackToEVM(
            order.initiator,
            amountOut,
            abi.encode(orderId)
        );
    }

    /**
     * Get swap order details
     */
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
