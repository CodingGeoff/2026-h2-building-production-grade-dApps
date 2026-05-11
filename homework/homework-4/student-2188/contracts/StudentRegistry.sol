// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StudentRegistry
 * @dev 学生注册表合约 - 部署在波卡 EVM 测试网 Moonbase Alpha 上
 * @notice 演示 struct、mapping、写入函数、读取函数的完整用法
 */
contract StudentRegistry {

    // ══════════════════════════════════════════════════════════
    //  数据结构定义
    // ══════════════════════════════════════════════════════════

    /**
     * @dev 学生信息结构体
     * @param name     学生姓名
     * @param age      学生年龄
     * @param grade    学生成绩 (0-100)
     * @param isRegistered 是否已注册（防止重复注册）
     * @param timestamp    注册时间戳（Unix 时间）
     */
    struct Student {
        string  name;
        uint256 age;
        uint256 grade;
        bool    isRegistered;
        uint256 timestamp;
    }

    // ══════════════════════════════════════════════════════════
    //  状态变量
    // ══════════════════════════════════════════════════════════

    /// @dev 核心映射：钱包地址 => 学生信息
    mapping(address => Student) private studentMap;

    /// @dev 存储所有已注册学生的地址列表（用于遍历）
    address[] private studentAddresses;

    /// @dev 合约管理员（部署者）
    address public immutable owner;

    /// @dev 已注册学生总数
    uint256 public totalStudents;

    // ══════════════════════════════════════════════════════════
    //  事件定义（区块链日志，链上永久记录）
    // ══════════════════════════════════════════════════════════

    /**
     * @dev 学生注册成功时触发此事件
     * indexed 关键字允许通过该字段快速检索日志
     */
    event StudentRegistered(
        address indexed studentAddress,
        string  name,
        uint256 age,
        uint256 grade,
        uint256 timestamp
    );

    /// @dev 学生信息更新时触发
    event StudentUpdated(
        address indexed studentAddress,
        uint256 newGrade,
        uint256 timestamp
    );

    // ══════════════════════════════════════════════════════════
    //  修饰符（Modifiers）
    // ══════════════════════════════════════════════════════════

    /// @dev 限制只有合约 owner 才能调用
    modifier onlyOwner() {
        require(msg.sender == owner, "StudentRegistry: Caller is not the owner");
        _;
    }

    /// @dev 限制成绩必须在 0-100 之间
    modifier validGrade(uint256 _grade) {
        require(_grade <= 100, "StudentRegistry: Grade must be between 0 and 100");
        _;
    }

    // ══════════════════════════════════════════════════════════
    //  构造函数
    // ══════════════════════════════════════════════════════════

    constructor() {
        owner = msg.sender; // 部署者成为管理员
        totalStudents = 0;
    }

    // ══════════════════════════════════════════════════════════
    //  写入函数（External / Public）- 会改变链上状态，需要 Gas
    // ══════════════════════════════════════════════════════════

    /**
     * @notice 注册一名新学生
     * @dev external 函数只能从合约外部调用，比 public 更省 gas
     * @param _name  学生姓名（不能为空）
     * @param _age   学生年龄（必须大于0）
     * @param _grade 学生成绩（0-100）
     *
     * 调用此函数会：
     * 1. 验证输入参数
     * 2. 创建 Student struct 并存入 mapping
     * 3. 记录地址到列表
     * 4. 触发 StudentRegistered 事件
     */
    function register(
        string  calldata _name,
        uint256 _age,
        uint256 _grade
    )
        external
        validGrade(_grade)
    {
        // 防止同一地址重复注册
        require(
            !studentMap[msg.sender].isRegistered,
            "StudentRegistry: Address already registered"
        );
        require(bytes(_name).length > 0, "StudentRegistry: Name cannot be empty");
        require(_age > 0 && _age < 150,  "StudentRegistry: Invalid age");

        // 创建学生结构体并存入 mapping
        studentMap[msg.sender] = Student({
            name:         _name,
            age:          _age,
            grade:        _grade,
            isRegistered: true,
            timestamp:    block.timestamp
        });

        // 记录地址
        studentAddresses.push(msg.sender);

        // 更新计数器
        totalStudents++;

        // 触发事件（写入区块链日志）
        emit StudentRegistered(
            msg.sender,
            _name,
            _age,
            _grade,
            block.timestamp
        );
    }

    /**
     * @notice 更新学生成绩（只有 owner 可以调用）
     * @param _student 目标学生地址
     * @param _newGrade 新的成绩
     */
    function updateGrade(address _student, uint256 _newGrade)
        external
        onlyOwner
        validGrade(_newGrade)
    {
        require(
            studentMap[_student].isRegistered,
            "StudentRegistry: Student not found"
        );

        studentMap[_student].grade = _newGrade;

        emit StudentUpdated(_student, _newGrade, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════
    //  读取函数（View）- 不改变状态，不消耗 Gas（本地调用）
    // ══════════════════════════════════════════════════════════

    /**
     * @notice 查询指定地址的学生信息
     * @dev view 函数不修改状态，调用免费（无需 gas）
     * @param _studentAddress 要查询的学生钱包地址
     * @return 完整的 Student 结构体
     */
    function getStudent(address _studentAddress)
        external
        view
        returns (Student memory)
    {
        require(
            studentMap[_studentAddress].isRegistered,
            "StudentRegistry: Student not registered"
        );
        return studentMap[_studentAddress];
    }

    /**
     * @notice 检查某个地址是否已注册
     * @param _address 待检查的地址
     * @return bool 是否已注册
     */
    function isRegistered(address _address) external view returns (bool) {
        return studentMap[_address].isRegistered;
    }

    /**
     * @notice 获取所有已注册学生的地址列表
     * @return address[] 地址数组
     */
    function getAllStudentAddresses() external view returns (address[] memory) {
        return studentAddresses;
    }
}