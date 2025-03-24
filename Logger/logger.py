import logging
from logging.handlers import RotatingFileHandler
import os

def GetLogger(name=__name__, filename=None, level=logging.INFO, log_to_console=False):
    if filename is None:
        module_path = os.path.relpath(name).replace('.', '_') + '.log'
        filename = os.path.join('logs', module_path)

    log_dir = os.path.dirname(filename)
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(level)

    file_handler = RotatingFileHandler(filename, maxBytes=10*1024*1024, backupCount=5) # 10MB maxBytes
    file_handler.setLevel(level)

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(message)s')
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)

    if log_to_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger
