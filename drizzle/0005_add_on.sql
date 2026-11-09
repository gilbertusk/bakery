CREATE TABLE "add_on" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"bahan_id" uuid NOT NULL,
	"takaran" numeric(14, 3) NOT NULL,
	"konversi_satuan_id" uuid,
	"takaran_dasar" numeric(14, 3) NOT NULL,
	"harga" integer NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "add_on_takaran_check" CHECK ("add_on"."takaran" > 0),
	CONSTRAINT "add_on_takaran_dasar_check" CHECK ("add_on"."takaran_dasar" > 0),
	CONSTRAINT "add_on_harga_check" CHECK ("add_on"."harga" >= 0)
);
--> statement-breakpoint
CREATE TABLE "penjualan_item_add_on" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"penjualan_item_id" uuid NOT NULL,
	"add_on_id" uuid NOT NULL,
	"nama_add_on" text NOT NULL,
	"harga_normal" integer NOT NULL,
	"harga" integer NOT NULL,
	"hpp_satuan" numeric(14, 2) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "penjualan_item_add_on_item_add_on_unique" UNIQUE("penjualan_item_id","add_on_id"),
	CONSTRAINT "penjualan_item_add_on_harga_normal_check" CHECK ("penjualan_item_add_on"."harga_normal" >= 0),
	CONSTRAINT "penjualan_item_add_on_harga_check" CHECK ("penjualan_item_add_on"."harga" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pre_order_item_add_on" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_item_id" uuid NOT NULL,
	"add_on_id" uuid NOT NULL,
	"harga_normal" integer NOT NULL,
	"harga" integer NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_order_item_add_on_item_add_on_unique" UNIQUE("pre_order_item_id","add_on_id"),
	CONSTRAINT "pre_order_item_add_on_harga_normal_check" CHECK ("pre_order_item_add_on"."harga_normal" >= 0),
	CONSTRAINT "pre_order_item_add_on_harga_check" CHECK ("pre_order_item_add_on"."harga" >= 0)
);
--> statement-breakpoint
ALTER TABLE "penjualan_item" DROP CONSTRAINT "penjualan_item_subtotal_check";--> statement-breakpoint
ALTER TABLE "penjualan_item" DROP CONSTRAINT "penjualan_item_diskon_check";--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD COLUMN "harga_add_on" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "add_on" ADD CONSTRAINT "add_on_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add_on" ADD CONSTRAINT "add_on_konversi_satuan_id_konversi_satuan_id_fk" FOREIGN KEY ("konversi_satuan_id") REFERENCES "public"."konversi_satuan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_item_add_on" ADD CONSTRAINT "penjualan_item_add_on_penjualan_item_id_penjualan_item_id_fk" FOREIGN KEY ("penjualan_item_id") REFERENCES "public"."penjualan_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_item_add_on" ADD CONSTRAINT "penjualan_item_add_on_add_on_id_add_on_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."add_on"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_item_add_on" ADD CONSTRAINT "pre_order_item_add_on_pre_order_item_id_pre_order_item_id_fk" FOREIGN KEY ("pre_order_item_id") REFERENCES "public"."pre_order_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_item_add_on" ADD CONSTRAINT "pre_order_item_add_on_add_on_id_add_on_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."add_on"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "add_on_nama_unique" ON "add_on" USING btree (lower("nama"));--> statement-breakpoint
CREATE INDEX "penjualan_item_add_on_add_on_idx" ON "penjualan_item_add_on" USING btree ("add_on_id");--> statement-breakpoint
CREATE INDEX "pre_order_item_add_on_add_on_idx" ON "pre_order_item_add_on" USING btree ("add_on_id");--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD CONSTRAINT "penjualan_item_harga_add_on_check" CHECK ("penjualan_item"."harga_add_on" >= 0);--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD CONSTRAINT "penjualan_item_subtotal_check" CHECK ("penjualan_item"."subtotal" = "penjualan_item"."qty" * ("penjualan_item"."harga_satuan" + "penjualan_item"."harga_add_on") - "penjualan_item"."diskon_item");--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD CONSTRAINT "penjualan_item_diskon_check" CHECK ("penjualan_item"."diskon_item" >= 0 AND "penjualan_item"."diskon_item" <= "penjualan_item"."qty" * ("penjualan_item"."harga_satuan" + "penjualan_item"."harga_add_on"));--> statement-breakpoint
ALTER TABLE "add_on" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "penjualan_item_add_on" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pre_order_item_add_on" ENABLE ROW LEVEL SECURITY;
