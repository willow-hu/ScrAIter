"""
日志配置模块
统一配置应用日志系统，包括文件日志、控制台日志和日志轮转
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path

class LoggingConfig:
    """日志配置类"""
    
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.logs_dir = os.path.join(base_dir, "logs")
        
        # 确保日志目录存在
        os.makedirs(self.logs_dir, exist_ok=True)
        
        # 日志文件路径
        self.app_log_file = os.path.join(self.logs_dir, "app.log")
        self.error_log_file = os.path.join(self.logs_dir, "error.log")
        
    def setup_logging(self, level: str = "INFO"):
        """
        设置日志系统
        
        Args:
            level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        # 设置根日志器
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, level.upper()))
        
        # 清除现有的处理器
        root_logger.handlers.clear()
        
        # 创建格式化器
        detailed_formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        simple_formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # 1. 控制台处理器 (INFO及以上)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(simple_formatter)
        root_logger.addHandler(console_handler)
        
        # 2. 应用日志文件处理器 (所有日志)
        # 使用轮转文件处理器，最大10MB，保留5个备份文件
        app_file_handler = RotatingFileHandler(
            self.app_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        app_file_handler.setLevel(logging.DEBUG)
        app_file_handler.setFormatter(detailed_formatter)
        root_logger.addHandler(app_file_handler)
        
        # 3. 错误日志文件处理器 (ERROR及以上)
        error_file_handler = RotatingFileHandler(
            self.error_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        error_file_handler.setLevel(logging.ERROR)
        error_file_handler.setFormatter(detailed_formatter)
        root_logger.addHandler(error_file_handler)
        
        # 设置第三方库的日志级别
        logging.getLogger("uvicorn").setLevel(logging.WARNING)
        logging.getLogger("fastapi").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        
        # 记录日志系统启动信息
        logging.info("=" * 60)
        logging.info("日志系统初始化完成")
        logging.info(f"应用日志文件: {self.app_log_file}")
        logging.info(f"错误日志文件: {self.error_log_file}")
        logging.info(f"日志级别: {level.upper()}")
        logging.info("=" * 60)
    
    def get_logger(self, name: str) -> logging.Logger:
        """
        获取指定名称的日志器
        
        Args:
            name: 日志器名称，通常使用 __name__
            
        Returns:
            Logger对象
        """
        return logging.getLogger(name)


def setup_logging(base_dir: str, level: str = "INFO"):
    """
    便捷函数：设置日志系统
    
    Args:
        base_dir: 项目基础目录
        level: 日志级别
    """
    config = LoggingConfig(base_dir)
    config.setup_logging(level)
    return config
