import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 定义初始值，也可以通过参数传入
const INITIAL_VALUE = 100n;

const StorageModule = buildModule("StorageModule", (m) => {
  // 获取初始参数（可选，运行命令时可通过 --parameters 覆盖）
  const initialValue = m.getParameter("initialValue", INITIAL_VALUE);

  // 部署合约
  // 参数 1: 合约名
  // 参数 2: 构造函数参数数组
  const storage = m.contract("Storage", [initialValue]);

  // 返回合约实例，以便其他模块依赖或在测试中使用
  return { storage };
});

export default StorageModule;