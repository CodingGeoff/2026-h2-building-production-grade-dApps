# 编程
使用ethers/viem 和 papi来完成如下功能，连接到polkadot testnet。

## 1. 编程实现地址的转换，并测试balance是否一致
已实现
```bash
H160: 0x5c434e203265949d679ec97b950dacf4e4d2e17e
SS58: 5E9gFpg3dBonbkn6TinMNUZ1CQyyvuEkkPXXBJJbVnPieKUR
SS58 -> H160: 0x5c434E203265949d679Ec97b950dAcf4E4D2E17e
Round-trip check: PASS
```
## 2. 选择一个precompile来调用
已实现
```bash
Request body: {"method":"eth_call","params":[{"data":"0x68656c6c6f2d706f6c6b61646f742d746573746e6574","to":"0x0000000000000000000000000000000000000002"},"latest"]}
 
Raw Call Arguments:
  to:    0x0000000000000000000000000000000000000002
  data:  0x68656c6c6f2d706f6c6b61646f742d746573746e6574

Details: fetch failed
Version: viem@2.48.4

ethers output: (no result)
ethers rpc   : (none succeeded)
viem output  : (no result)
viem rpc     : (none succeeded)
local sha256 : 0x5977112e9ae35e07a45820ebda8e00d643b4188b05a7e855f9a7a9b668b780f2

Verification:
ethers == sha256 : FAIL
viem   == sha256 : FAIL
```