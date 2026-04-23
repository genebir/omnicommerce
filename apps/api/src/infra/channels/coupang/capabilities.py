from src.infra.channels.base import ChannelCapabilities

COUPANG_CAPABILITIES = ChannelCapabilities(
    supports_options=True,
    supports_scheduled_publish=False,
    supports_bulk_inventory=False,
    supports_webhook=False,
    supports_partial_update=False,
    max_images_per_product=10,
    max_option_combinations=200,
    order_fetch_min_interval_sec=60,
    category_schema="code",
)
