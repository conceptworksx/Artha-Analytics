class DomainError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class UserAlreadyExistsError(DomainError):
    pass


class InvalidCredentialsError(DomainError):
    pass


class UserNotFoundError(DomainError):
    pass


class InvalidCurrentPasswordError(DomainError):
    pass


class UnverifiedGoogleEmailError(DomainError):
    pass


class InvalidTokenError(DomainError):
    pass


class InvalidTickerFormatError(DomainError):
    pass


class TickerNotFoundError(DomainError):
    pass


class SearchLimitReachedError(DomainError):
    pass


class DatabaseOperationError(DomainError):
    pass


class ConfigurationError(DomainError):
    pass


class InvalidAPIKeyError(DomainError):
    pass
