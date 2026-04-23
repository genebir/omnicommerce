from src.infra.channels.base import ChannelCapabilities

CAFE24_CAPABILITIES = ChannelCapabilities(
    supports_options=True,
    supports_scheduled_publish=True,
    supports_bulk_inventory=True,
    supports_webhook=True,
    supports_partial_update=True,
    max_images_per_product=20,
    max_option_combinations=100,
    order_fetch_min_interval_sec=60,
    category_schema="tree",
)
