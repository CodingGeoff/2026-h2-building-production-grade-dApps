from web3 import Web3
from eth_account import Account
import os

SEPOLIA_RPC = os.environ.get("SEPOLIA_RPC", "https://rpc.sepolia.org")
w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC))

print(f"Connected: {w3.is_connected()}")
print(f"Block: {w3.eth.block_number}")
print(f"Chain: {w3.eth.chain_id}")

addr = "0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E"
bal = w3.from_wei(w3.eth.get_balance(addr), "ether")
print(f"{addr[:10]}... balance: {bal} ETH")

pk = os.environ.get("PRIVATE_KEY", "")
if pk:
    acct = Account.from_key(pk)
    tx = {
        "from": acct.address,
        "to": addr,
        "value": w3.to_wei(0.001, "ether"),
        "gas": 21000,
        "gasPrice": w3.eth.gas_price,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": 11155111,
    }
    signed = acct.sign_transaction(tx)
    print(f"Signed: {signed.hash.hex()}")
else:
    print("Set PRIVATE_KEY env for transactions")
