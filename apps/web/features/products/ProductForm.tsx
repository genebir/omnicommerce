"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/use-products";

interface ProductFormProps {
  defaultValues?: ProductFormValues;
  productId?: string;
}

export function ProductForm({ defaultValues, productId }: ProductFormProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const router = useRouter();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(productId ?? "");
  const isEdit = !!productId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  async function onSubmit(data: ProductFormValues) {
    try {
      if (isEdit) {
        await updateProduct.mutateAsync({
          name: data.name,
          sku: data.sku,
          price: data.price,
          description: data.description,
        });
        toast.success(t("saveSuccess"));
      } else {
        await createProduct.mutateAsync({
          name: data.name,
          sku: data.sku,
          price: data.price,
          description: data.description,
        });
        toast.success(t("createSuccess"));
      }
      router.push("/products");
    } catch {
      toast.error(isEdit ? t("saveError") : t("createError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {t("basicInfo")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">{t("fieldName")}</Label>
            <Input
              id="name"
              placeholder={t("fieldNamePlaceholder")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-xs text-state-error">
                {t("fieldNameRequired")}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="sku">{t("fieldSku")}</Label>
            <Input
              id="sku"
              placeholder="SKU-0001"
              className="font-mono"
              aria-invalid={!!errors.sku}
              aria-describedby={errors.sku ? "sku-error" : undefined}
              {...register("sku")}
            />
            {errors.sku && (
              <p id="sku-error" className="mt-1 text-xs text-state-error">
                {t("fieldSkuRequired")}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="price">{t("fieldPrice")}</Label>
            <Input
              id="price"
              type="number"
              min={0}
              placeholder="0"
              className="font-mono"
              aria-invalid={!!errors.price}
              {...register("price")}
            />
          </div>
          <div>
            <Label htmlFor="stock">{t("fieldStock")}</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              placeholder="0"
              className="font-mono"
              {...register("stock")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {t("description")}
        </h2>
        <textarea
          rows={5}
          placeholder={t("descriptionPlaceholder")}
          className="w-full rounded-lg border border-border-strong bg-bg-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring-focus"
          {...register("description")}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
        >
          {tc("cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer rounded-xl bg-accent-iris px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-iris/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? tc("loading") : tc("save")}
        </button>
      </div>
    </form>
  );
}
