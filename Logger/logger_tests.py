import os
import logging
from .logger import get_logger, LoggerManager

def run_logger_tests():
    """Run a series of tests on the logger functionality"""
    print("\n=== Starting Logger Tests ===")
    
    # Test 1: Basic logging with different levels
    logger = get_logger('test_basic', log_to_console=True)
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    logger.critical("This is a critical message")
    print("✓ Basic logging test completed")

    # Test 2: Test file rotation
    # Set rotation parameters before creating the logger
    LoggerManager.set_default_rotation(max_bytes=1024, backup_count=3)
    rotation_logger = get_logger(
        'test_rotation',
        filename='logs/rotation_test.log',
        log_to_console=True
    )
    
    # Write enough messages to trigger rotation
    for i in range(100):
        rotation_logger.info(f"Test message {i}: " + "x" * 100)  # Add some content to fill the file
    print("✓ File rotation test completed")
    
    # Test 3: Test logger caching
    logger1 = get_logger('test_cache')
    logger2 = get_logger('test_cache')
    logger1.info("This message should appear only once in the log file")
    logger2.info("This message should appear only once in the log file")
    print("✓ Logger caching test completed")

    # Test 4: Test error handling with invalid path
    try:
        invalid_logger = get_logger(
            'test_error',
            filename='/invalid/path/test.log',
            log_to_console=True
        )
        invalid_logger.info("This should not be logged to file")
    except Exception as e:
        print(f"✓ Error handling test completed (Expected error: {str(e)})")

    # Test 5: Test changing default settings
    LoggerManager.set_default_level(logging.DEBUG)
    LoggerManager.set_default_rotation(max_bytes=2048, backup_count=2)
    
    new_logger = get_logger('test_defaults')
    new_logger.debug("This debug message should be visible due to changed default level")
    print("✓ Default settings test completed")
    
    # Test 6: Test with different encodings
    unicode_logger = get_logger('test_unicode', log_to_console=True)
    unicode_logger.info("Testing Unicode: 你好世界")
    unicode_logger.info("Testing special chars: !@#$%^&*()")
    print("✓ Encoding test completed")

    print("\n=== Logger Tests Completed ===")
    print("Check the 'logs' directory for the test results") 