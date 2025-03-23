import logging
from logging.handlers import RotatingFileHandler
import os

def GetLogger(name=__name__, filename=None, level=logging.INFO, log_to_console=False):
    if filename is None:
        # Use full module path to avoid filename clashes
        module_path = os.path.relpath(name).replace('.', '_') + '.log'
        filename = os.path.join('logs', module_path)  # Log to a 'logs' directory

    # Ensure the log directory exists
    log_dir = os.path.dirname(filename)
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Create a rotating file handler
    file_handler = RotatingFileHandler(filename, maxBytes=10*1024*1024, backupCount=5) # 10MB maxBytes
    file_handler.setLevel(level)

    # Create a formatter and add it to the file handler
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(message)s')
    file_handler.setFormatter(formatter)

    # Add the file handler to the logger
    logger.addHandler(file_handler)

    if log_to_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger
