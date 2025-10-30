#!/bin/bash
# 日志管理工具脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_help() {
    echo "日志管理工具"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  tail          实时查看应用日志 (app.log)"
    echo "  error         实时查看错误日志 (error.log)"
    echo "  show          显示最近100行应用日志"
    echo "  show-error    显示最近100行错误日志"
    echo "  clean         清理旧的日志文件（保留当前日志）"
    echo "  stats         显示日志统计信息"
    echo "  search TEXT   在应用日志中搜索指定文本"
    echo "  help          显示此帮助信息"
    echo ""
}

tail_logs() {
    if [ ! -f "$LOGS_DIR/app.log" ]; then
        echo -e "${YELLOW}警告: app.log 文件不存在，可能还没有启动过应用${NC}"
        exit 1
    fi
    echo -e "${GREEN}实时查看应用日志 (Ctrl+C 退出)${NC}"
    tail -f "$LOGS_DIR/app.log"
}

tail_error() {
    if [ ! -f "$LOGS_DIR/error.log" ]; then
        echo -e "${YELLOW}警告: error.log 文件不存在${NC}"
        exit 1
    fi
    echo -e "${GREEN}实时查看错误日志 (Ctrl+C 退出)${NC}"
    tail -f "$LOGS_DIR/error.log"
}

show_logs() {
    if [ ! -f "$LOGS_DIR/app.log" ]; then
        echo -e "${YELLOW}警告: app.log 文件不存在${NC}"
        exit 1
    fi
    echo -e "${GREEN}最近100行应用日志:${NC}"
    tail -n 100 "$LOGS_DIR/app.log"
}

show_error() {
    if [ ! -f "$LOGS_DIR/error.log" ]; then
        echo -e "${YELLOW}警告: error.log 文件不存在${NC}"
        exit 1
    fi
    echo -e "${GREEN}最近100行错误日志:${NC}"
    tail -n 100 "$LOGS_DIR/error.log"
}

clean_logs() {
    echo -e "${YELLOW}清理旧的日志备份文件...${NC}"
    
    # 删除旧的 graph_build.log（已废弃）
    if [ -f "$LOGS_DIR/graph_build.log" ]; then
        rm "$LOGS_DIR/graph_build.log"
        echo -e "${GREEN}✓ 删除废弃的 graph_build.log${NC}"
    fi
    
    # 删除日志备份文件
    find "$LOGS_DIR" -name "*.log.*" -type f -delete 2>/dev/null
    
    echo -e "${GREEN}✓ 清理完成${NC}"
}

show_stats() {
    if [ ! -d "$LOGS_DIR" ]; then
        echo -e "${YELLOW}警告: logs 目录不存在${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}日志统计信息:${NC}"
    echo ""
    
    # 应用日志
    if [ -f "$LOGS_DIR/app.log" ]; then
        app_size=$(du -h "$LOGS_DIR/app.log" | cut -f1)
        app_lines=$(wc -l < "$LOGS_DIR/app.log")
        echo -e "应用日志 (app.log):"
        echo -e "  大小: $app_size"
        echo -e "  行数: $app_lines"
        
        # 统计各级别日志数量
        if command -v grep &> /dev/null; then
            debug_count=$(grep -c "\[DEBUG\]" "$LOGS_DIR/app.log" 2>/dev/null || echo 0)
            info_count=$(grep -c "\[INFO\]" "$LOGS_DIR/app.log" 2>/dev/null || echo 0)
            warning_count=$(grep -c "\[WARNING\]" "$LOGS_DIR/app.log" 2>/dev/null || echo 0)
            error_count=$(grep -c "\[ERROR\]" "$LOGS_DIR/app.log" 2>/dev/null || echo 0)
            
            echo -e "  级别分布:"
            echo -e "    DEBUG: $debug_count"
            echo -e "    INFO: $info_count"
            echo -e "    WARNING: $warning_count"
            echo -e "    ERROR: $error_count"
        fi
    else
        echo -e "${YELLOW}应用日志文件不存在${NC}"
    fi
    
    echo ""
    
    # 错误日志
    if [ -f "$LOGS_DIR/error.log" ]; then
        error_size=$(du -h "$LOGS_DIR/error.log" | cut -f1)
        error_lines=$(wc -l < "$LOGS_DIR/error.log")
        echo -e "错误日志 (error.log):"
        echo -e "  大小: $error_size"
        echo -e "  行数: $error_lines"
    else
        echo -e "${YELLOW}错误日志文件不存在${NC}"
    fi
    
    echo ""
    
    # 备份文件
    backup_count=$(find "$LOGS_DIR" -name "*.log.*" -type f 2>/dev/null | wc -l)
    if [ $backup_count -gt 0 ]; then
        backup_size=$(du -ch "$LOGS_DIR"/*.log.* 2>/dev/null | tail -1 | cut -f1)
        echo -e "备份文件: $backup_count 个 (总计: $backup_size)"
    fi
}

search_logs() {
    if [ -z "$1" ]; then
        echo -e "${RED}错误: 请提供搜索文本${NC}"
        echo "用法: $0 search <搜索文本>"
        exit 1
    fi
    
    if [ ! -f "$LOGS_DIR/app.log" ]; then
        echo -e "${YELLOW}警告: app.log 文件不存在${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}在应用日志中搜索: '$1'${NC}"
    echo ""
    grep --color=auto "$1" "$LOGS_DIR/app.log" || echo -e "${YELLOW}未找到匹配结果${NC}"
}

# 主逻辑
case "$1" in
    tail)
        tail_logs
        ;;
    error)
        tail_error
        ;;
    show)
        show_logs
        ;;
    show-error)
        show_error
        ;;
    clean)
        clean_logs
        ;;
    stats)
        show_stats
        ;;
    search)
        search_logs "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -z "$1" ]; then
            show_help
        else
            echo -e "${RED}错误: 未知命令 '$1'${NC}"
            echo ""
            show_help
            exit 1
        fi
        ;;
esac
