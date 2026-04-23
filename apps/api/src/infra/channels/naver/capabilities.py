from src.infra.channels.base import ChannelCapabilities

NAVER_CAPABILITIES = ChannelCapabilities(
    supports_options=True,
    supports_scheduled_publish=False,
    supports_bulk_inventory=True,
    supports_webhook=False,
    supports_partial_update=True,
    max_images_per_product=10,
    max_option_combinations=50,
    order_fetch_min_interval_sec=180,
    category_schema="code",
)
