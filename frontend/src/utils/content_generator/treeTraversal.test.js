/**
 * 树遍历工具函数测试示例
 * 
 * 这个文件包含了一些基本的测试用例，用于验证treeTraversal.js中函数的正确性
 * 可以在浏览器控制台中运行这些测试
 */

import { 
  flattenTreeDFS, 
  flattenTreeBFS, 
  findNodeById, 
  getNodeDescendants, 
  getNodePath, 
  validateTreeStructure 
} from './treeTraversal.js';

// 测试数据：数组格式的树结构
const testTreeArray = [
  {id: 1, name: "景点简介", child_ids: [2, 3]},
  {id: 2, name: "建造背景", child_ids: [4]},
  {id: 3, name: "文化价值", child_ids: []},
  {id: 4, name: "破坏与修缮", child_ids: [5, 6]},
  {id: 5, name: "正殿原貌", child_ids: []},
  {id: 6, name: "现存构件", child_ids: []}
];

// 测试数据：嵌套对象格式的树结构
const testTreeNested = {
  id: 1,
  name: "景点简介",
  child_ids: [2, 3],
  children: [
    {id: 2, name: "建造背景", child_ids: []},
    {id: 3, name: "文化价值", child_ids: []}
  ]
};

/**
 * 运行所有测试
 */
export function runTests() {
  console.log('🚀 开始运行树遍历工具函数测试...\n');

  // 测试1: DFS遍历
  console.log('📋 测试1: DFS遍历');
  const dfsResult = flattenTreeDFS(testTreeArray);
  console.log('DFS结果:', dfsResult.map(node => `${node.id}: ${node.name}`));
  console.log('预期顺序: 1->2->4->5->6->3');
  console.log('✅ DFS测试完成\n');

  // 测试2: BFS遍历
  console.log('📋 测试2: BFS遍历');
  const bfsResult = flattenTreeBFS(testTreeArray);
  console.log('BFS结果:', bfsResult.map(node => `${node.id}: ${node.name}`));
  console.log('预期顺序: 1->2->3->4->5->6');
  console.log('✅ BFS测试完成\n');

  // 测试3: 根据ID查找节点
  console.log('📋 测试3: 根据ID查找节点');
  const foundNode = findNodeById(testTreeArray, 4);
  console.log('查找节点ID=4:', foundNode ? foundNode.name : '未找到');
  console.log('预期结果: 破坏与修缮');
  console.log('✅ 节点查找测试完成\n');

  // 测试4: 获取子孙节点
  console.log('📋 测试4: 获取子孙节点');
  const descendants = getNodeDescendants(testTreeArray, 2);
  console.log('节点2的子孙:', descendants.map(node => `${node.id}: ${node.name}`));
  console.log('预期结果: 4, 5, 6');
  console.log('✅ 子孙节点测试完成\n');

  // 测试5: 获取节点路径
  console.log('📋 测试5: 获取节点路径');
  const path = getNodePath(testTreeArray, 5);
  console.log('到节点5的路径:', path.map(node => `${node.id}: ${node.name}`));
  console.log('预期路径: 1->2->4->5');
  console.log('✅ 节点路径测试完成\n');

  // 测试6: 结构验证
  console.log('📋 测试6: 结构验证');
  const validation = validateTreeStructure(testTreeArray);
  console.log('结构验证结果:', validation);
  console.log('预期结果: isValid=true, errors=[]');
  
  // 测试无效结构
  const invalidTree = [
    {id: 1, name: "root", child_ids: [2]},
    {id: 2, name: "child", child_ids: [1]} // 循环引用
  ];
  const invalidValidation = validateTreeStructure(invalidTree);
  console.log('无效结构验证结果:', invalidValidation);
  console.log('预期结果: isValid=false, 包含循环引用错误');
  console.log('✅ 结构验证测试完成\n');

  console.log('🎉 所有测试完成！');
}

/**
 * 性能测试：大型树结构
 */
export function performanceTest() {
  console.log('⚡ 开始性能测试...\n');

  // 生成大型树结构（1000个节点）
  const largeTree = [];
  for (let i = 1; i <= 1000; i++) {
    const childIds = i * 2 <= 1000 ? [i * 2] : [];
    if (i * 2 + 1 <= 1000) childIds.push(i * 2 + 1);
    
    largeTree.push({
      id: i,
      name: `Node${i}`,
      child_ids: childIds
    });
  }

  console.log(`生成了包含${largeTree.length}个节点的测试树`);

  // 测试DFS性能
  console.time('DFS遍历性能');
  const dfsLarge = flattenTreeDFS(largeTree);
  console.timeEnd('DFS遍历性能');
  console.log(`DFS遍历结果: ${dfsLarge.length}个节点`);

  // 测试BFS性能
  console.time('BFS遍历性能');
  const bfsLarge = flattenTreeBFS(largeTree);
  console.timeEnd('BFS遍历性能');
  console.log(`BFS遍历结果: ${bfsLarge.length}个节点`);

  // 测试查找性能
  console.time('节点查找性能');
  const foundLarge = findNodeById(largeTree, 500);
  console.timeEnd('节点查找性能');
  console.log(`查找结果: ${foundLarge ? foundLarge.name : '未找到'}`);

  console.log('⚡ 性能测试完成！');
}

// 在浏览器环境中可以直接调用
if (typeof window !== 'undefined') {
  // 将测试函数挂载到全局，方便在控制台调用
  window.treeTraversalTests = {
    runTests,
    performanceTest
  };
  
  console.log('🔧 树遍历测试工具已加载！');
  console.log('在控制台中运行以下命令来执行测试：');
  console.log('- window.treeTraversalTests.runTests() // 基本功能测试');
  console.log('- window.treeTraversalTests.performanceTest() // 性能测试');
}
