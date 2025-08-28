/**
 * Tree Editor 配置文件
 * 统一管理所有数值配置，便于调整和维护
 */

export const TREE_EDITOR_CONFIG = {
  // 节点尺寸配置
  node: {
    width: 160,           // 节点宽度
    height: 60,           // 节点高度
  },

  // 布局配置
  layout: {
    levelHeight: 150,     // 层级间距
    nodeSpacing: 20,      // 节点间最小间距
    rootStartX: 200,      // 根节点起始X位置
    rootSpacingMultiplier: 3,  // 根节点间距倍数
    initialYOffset: 100,  // 初始Y偏移
    defaultPosition: { x: 100, y: 100 },  // 默认节点位置
  },

  // 渲染配置
  rendering: {
    // 边样式
    edge: {
      color: '#666',        // 边的颜色
      width: 2,            // 边的宽度
      arrowLength: 10,     // 箭头长度
    },

    // 节点样式
    node: {
      // 背景色
      backgroundColor: {
        normal: 'white',      // 未选中节点背景色
        selected: '#f0f8ff',  // 选中节点背景色
      },
      
      // 边框
      border: {
        color: {
          normal: '#ddd',     // 未选中节点边框色
          selected: '#007acc', // 选中节点边框色
        },
        width: {
          normal: 2,          // 未选中节点边框宽度
          selected: 3,        // 选中节点边框宽度
        },
      },
    },

    // 文本样式
    text: {
      padding: 8,           // 文本内边距
      
      // ID文本
      id: {
        color: '#666',        // ID文本颜色
        fontSize: '12px',     // 字体大小
        fontFamily: 'Arial',  // 字体族
        fontWeight: 'normal', // 字体粗细
        textAlign: 'left',    // 文本对齐方式
        verticalAlign: 'top', // 垂直对齐方式
        offsetY: 10,          // ID文本Y偏移
      },
      
      // 名称文本
      name: {
        color: '#333',        // 名称文本颜色
        fontSize: '16px',     // 字体大小
        fontFamily: 'Arial',  // 字体族
        fontWeight: 'bold',   // 字体粗细
        textAlign: 'center',  // 文本对齐方式
        verticalAlign: 'middle', // 垂直对齐方式
        truncateLength: 15,   // 文本截断长度
      },
    },
  },

  // 交互配置
  interaction: {
    // 缩放配置
    zoom: {
      scaleFactorIn: 1.2,   // 放大因子
      scaleFactorOut: 0.8,  // 缩小因子
      minScale: 0.1,        // 最小缩放比例
      maxScale: 3,          // 最大缩放比例
    },

    // 碰撞检测配置
    collision: {
      edgeTolerance: 5,     // 边的容错距离（像素）
    },
  },
};
