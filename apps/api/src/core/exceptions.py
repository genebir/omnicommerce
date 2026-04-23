class OmniCommerceError(Exception):
    pass


class NotFoundError(OmniCommerceError):
    pass


class ConflictError(OmniCommerceError):
    pass


class UnknownChannelError(OmniCommerceError):
    def __init__(self, code: str) -> None:
        super().__init__(f"알 수 없는 채널: {code}")
        self.code = code


class ChannelSyncError(OmniCommerceError):
    def __init__(self, channel: str, detail: str, status: int | None = None) -> None:
        super().__init__(f"[{channel}] 동기화 실패: {detail}")
        self.channel = channel
        self.detail = detail
        self.status = status


class ChannelResourceNotFoundError(ChannelSyncError):
    """채널에서 리소스를 찾을 수 없음 (404). 이미 삭제된 경우 정상으로 처리할 수 있다."""


class AuthenticationError(OmniCommerceError):
    pass


class AuthorizationError(OmniCommerceError):
    pass


class ValidationError(OmniCommerceError):
    pass
