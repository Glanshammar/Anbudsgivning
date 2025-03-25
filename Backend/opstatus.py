from enum import Enum, IntEnum

class OpStatus(IntEnum):
    SUCCESS = 0
    INVALID_FIELD = 1
    DOCUMENT_NOT_FOUND = 2
    EMPTY_DOCUMENT = 3
    OPERATION_CANCELLED = 4
    INVALID_INPUT = 5