/**
 * CSS属性处理工具类
 * 负责将CSS样式属性应用到Canvas上下文
 */

export class CSSHelper {
  /**
   * 应用文本样式到Canvas上下文
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Object} textStyle - 文本样式配置
   */
  static applyTextStyle(ctx, textStyle) {
    // 构建字体字符串 (CSS font属性格式: [font-weight] [font-size] [font-family])
    const fontSize = textStyle.fontSize || '12px';
    const fontFamily = textStyle.fontFamily || 'Arial';
    const fontWeight = textStyle.fontWeight || 'normal';
    
    ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    
    // 设置文本颜色
    if (textStyle.color) {
      ctx.fillStyle = textStyle.color;
    }
    
    // 设置文本对齐方式
    if (textStyle.textAlign) {
      ctx.textAlign = textStyle.textAlign;
    }
    
    // 设置文本基线对齐方式
    if (textStyle.verticalAlign) {
      switch (textStyle.verticalAlign) {
        case 'top':
          ctx.textBaseline = 'top';
          break;
        case 'middle':
          ctx.textBaseline = 'middle';
          break;
        case 'bottom':
          ctx.textBaseline = 'bottom';
          break;
        default:
          ctx.textBaseline = 'alphabetic';
      }
    }
  }

  /**
   * 计算文本绘制位置
   * @param {Object} nodePos - 节点位置
   * @param {Object} nodeSize - 节点尺寸
   * @param {Object} textStyle - 文本样式
   * @param {number} padding - 内边距
   * @returns {Object} 文本绘制位置 {x, y}
   */
  static calculateTextPosition(nodePos, nodeSize, textStyle, padding = 8) {
    let x = nodePos.x + padding;
    let y = nodePos.y + padding;

    // 水平对齐
    switch (textStyle.textAlign) {
      case 'center':
        x = nodePos.x + nodeSize.width / 2;
        break;
      case 'right':
        x = nodePos.x + nodeSize.width - padding;
        break;
      case 'left':
      default:
        x = nodePos.x + padding;
        break;
    }

    // 垂直对齐
    switch (textStyle.verticalAlign) {
      case 'middle':
        y = nodePos.y + nodeSize.height / 2;
        break;
      case 'bottom':
        y = nodePos.y + nodeSize.height - padding;
        break;
      case 'top':
      default:
        y = nodePos.y + padding;
        break;
    }

    // 如果有手动偏移，应用偏移
    if (textStyle.offsetY !== undefined) {
      y = nodePos.y + textStyle.offsetY;
    }

    return { x, y };
  }

  /**
   * 应用边框样式到Canvas上下文
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Object} borderStyle - 边框样式配置
   */
  static applyBorderStyle(ctx, borderStyle) {
    if (borderStyle.color) {
      ctx.strokeStyle = borderStyle.color;
    }
    
    if (borderStyle.width) {
      ctx.lineWidth = borderStyle.width;
    }
  }

  /**
   * 应用背景样式到Canvas上下文
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {string} backgroundColor - 背景颜色
   */
  static applyBackgroundStyle(ctx, backgroundColor) {
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
    }
  }

  /**
   * 处理文本溢出截断
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {string} text - 原始文本
   * @param {number} maxWidth - 最大宽度
   * @param {number} truncateLength - 截断长度
   * @returns {string} 处理后的文本
   */
  static truncateText(ctx, text, maxWidth, truncateLength) {
    if (!text) return '';
    
    const textWidth = ctx.measureText(text).width;
    
    if (textWidth <= maxWidth) {
      return text;
    }
    
    // 如果设置了截断长度，使用字符截断
    if (truncateLength && text.length > truncateLength) {
      return text.substring(0, truncateLength) + '...';
    }
    
    // 否则根据实际宽度截断
    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    
    return truncated + (truncated.length < text.length ? '...' : '');
  }
}
