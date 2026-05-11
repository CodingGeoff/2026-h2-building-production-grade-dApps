#!/bin/bash

echo "=== Uniswap V2 Sepolia Deployment ==="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create .env file from .env.example and configure your private key"
    exit 1
fi

# Check if PRIVATE_KEY is set
if ! grep -q "PRIVATE_KEY=your_actual_private_key_here" .env; then
    echo "Error: PRIVATE_KEY is still set to placeholder value!"
    echo "Please edit .env file and set your actual private key"
    exit 1
fi

echo "✅ Configuration looks good"
echo ""

echo "Starting deployment to Sepolia testnet..."
echo ""

# Run deployment
npx hardhat run scripts/deploy.js --network sepolia

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your contracts have been deployed to Sepolia testnet!"
echo "Check deployment-addresses.json for contract addresses"
echo ""
echo "You can now verify your contracts on Etherscan:"
echo "https://sepolia.etherscan.io/"
