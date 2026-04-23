--
-- PostgreSQL database dump
--

\restrict kxVrl4yLTPljuHBgMJNPeZeRlp08jk3TeQE9tJv87sbANwR89th5Pdcj4du9noU

-- Dumped from database version 18.3 (Ubuntu 18.3-1.pgdg24.04+1)
-- Dumped by pg_dump version 18.3 (Ubuntu 18.3-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id uuid NOT NULL,
    key character varying(200) NOT NULL,
    value jsonb NOT NULL,
    value_type character varying(20) NOT NULL,
    scope character varying(200) NOT NULL,
    description text NOT NULL,
    is_secret boolean NOT NULL,
    default_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings_history (
    id uuid NOT NULL,
    setting_id uuid NOT NULL,
    key character varying(200) NOT NULL,
    old_value jsonb,
    new_value jsonb NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: channel_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_listings (
    product_id uuid NOT NULL,
    channel_type character varying(50) NOT NULL,
    external_id character varying(200) NOT NULL,
    external_url character varying(1000),
    sync_status character varying(20) NOT NULL,
    last_synced_at timestamp with time zone,
    last_error text,
    raw_payload jsonb,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: channel_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_types (
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    user_id uuid NOT NULL,
    channel_type character varying(50) NOT NULL,
    shop_name character varying(200) NOT NULL,
    credentials_encrypted text NOT NULL,
    is_active boolean NOT NULL,
    raw_config jsonb,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: inventories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventories (
    product_id uuid NOT NULL,
    sku character varying(100) NOT NULL,
    warehouse_id character varying(50) NOT NULL,
    total_quantity integer NOT NULL,
    allocated integer NOT NULL,
    available integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    order_id uuid NOT NULL,
    product_id uuid,
    external_product_id character varying(200),
    sku character varying(100),
    name character varying(500) NOT NULL,
    option_text character varying(500),
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    user_id uuid NOT NULL,
    channel_type character varying(50) NOT NULL,
    external_order_id character varying(200) NOT NULL,
    status character varying(30) NOT NULL,
    buyer_name character varying(100),
    buyer_phone character varying(30),
    buyer_email character varying(255),
    recipient_name character varying(100),
    recipient_phone character varying(30),
    recipient_address text,
    recipient_zipcode character varying(10),
    total_amount numeric(12,2) NOT NULL,
    shipping_fee numeric(12,2) NOT NULL,
    ordered_at timestamp with time zone,
    paid_at timestamp with time zone,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    tracking_number character varying(100),
    tracking_company character varying(100),
    raw_payload jsonb,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    product_id uuid NOT NULL,
    url character varying(1000) NOT NULL,
    sort_order integer NOT NULL,
    alt_text character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: product_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_options (
    product_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    "values" jsonb NOT NULL,
    sku_suffix character varying(50),
    price_adjustment numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    user_id uuid NOT NULL,
    sku character varying(100) NOT NULL,
    name character varying(500) NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    cost_price numeric(12,2),
    category_path character varying(500),
    status character varying(20) NOT NULL,
    raw_payload jsonb,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    is_superuser boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: app_settings_history app_settings_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings_history
    ADD CONSTRAINT app_settings_history_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: channel_listings channel_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_listings
    ADD CONSTRAINT channel_listings_pkey PRIMARY KEY (id);


--
-- Name: channel_types channel_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_types
    ADD CONSTRAINT channel_types_code_key UNIQUE (code);


--
-- Name: channel_types channel_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_types
    ADD CONSTRAINT channel_types_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: inventories inventories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT inventories_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_options product_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: app_settings uq_app_setting_key_scope; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT uq_app_setting_key_scope UNIQUE (key, scope);


--
-- Name: channels uq_channel_per_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT uq_channel_per_user UNIQUE (user_id, channel_type, shop_name);


--
-- Name: inventories uq_inventory_sku_warehouse; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT uq_inventory_sku_warehouse UNIQUE (sku, warehouse_id);


--
-- Name: channel_listings uq_listing_per_channel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_listings
    ADD CONSTRAINT uq_listing_per_channel UNIQUE (product_id, channel_type, external_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_channel_listings_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_channel_listings_product_id ON public.channel_listings USING btree (product_id);


--
-- Name: ix_inventories_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inventories_sku ON public.inventories USING btree (sku);


--
-- Name: ix_orders_external_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_external_order_id ON public.orders USING btree (external_order_id);


--
-- Name: ix_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: ix_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_sku ON public.products USING btree (sku);


--
-- Name: ix_products_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_user_id ON public.products USING btree (user_id);


--
-- Name: app_settings_history app_settings_history_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings_history
    ADD CONSTRAINT app_settings_history_setting_id_fkey FOREIGN KEY (setting_id) REFERENCES public.app_settings(id) ON DELETE CASCADE;


--
-- Name: channel_listings channel_listings_channel_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_listings
    ADD CONSTRAINT channel_listings_channel_type_fkey FOREIGN KEY (channel_type) REFERENCES public.channel_types(code);


--
-- Name: channel_listings channel_listings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_listings
    ADD CONSTRAINT channel_listings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: channels channels_channel_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_channel_type_fkey FOREIGN KEY (channel_type) REFERENCES public.channel_types(code);


--
-- Name: channels channels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: inventories inventories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT inventories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_channel_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_channel_type_fkey FOREIGN KEY (channel_type) REFERENCES public.channel_types(code);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_options product_options_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict kxVrl4yLTPljuHBgMJNPeZeRlp08jk3TeQE9tJv87sbANwR89th5Pdcj4du9noU
