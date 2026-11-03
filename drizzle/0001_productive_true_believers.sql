CREATE TABLE "kas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	"jenis" "jenis_kas" NOT NULL,
	"kategori_kas_id" uuid NOT NULL,
	"akun" "akun_kas" NOT NULL,
	"nominal" integer NOT NULL,
	"keterangan" text,
	"sumber_tipe" "sumber_tipe",
	"sumber_id" uuid,
	"dibatalkan" boolean DEFAULT false NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	CONSTRAINT "kas_nominal_check" CHECK ("kas"."nominal" > 0)
);
--> statement-breakpoint
CREATE TABLE "kategori_kas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"jenis" "jenis_kas" NOT NULL,
	"kelompok" "kelompok_kas" NOT NULL,
	"sistem" boolean DEFAULT false NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kategori_kas_nama_unique" UNIQUE("nama")
);
--> statement-breakpoint
CREATE TABLE "penjualan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_nota" text NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	"subtotal" integer NOT NULL,
	"diskon_nota" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"metode_bayar" "metode_bayar" NOT NULL,
	"dibayar" integer DEFAULT 0 NOT NULL,
	"kembalian" integer DEFAULT 0 NOT NULL,
	"catatan" text,
	"pre_order_id" uuid,
	"kunci_idempoten" uuid,
	"status" "status_trx" DEFAULT 'selesai' NOT NULL,
	"alasan_batal" text,
	"dibatalkan_oleh" uuid,
	"dibatalkan_pada" timestamp with time zone,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "penjualan_no_nota_unique" UNIQUE("no_nota"),
	CONSTRAINT "penjualan_pre_order_id_unique" UNIQUE("pre_order_id"),
	CONSTRAINT "penjualan_kunci_idempoten_unique" UNIQUE("kunci_idempoten"),
	CONSTRAINT "penjualan_diskon_nota_check" CHECK ("penjualan"."diskon_nota" >= 0 AND "penjualan"."diskon_nota" <= "penjualan"."subtotal"),
	CONSTRAINT "penjualan_total_check" CHECK ("penjualan"."total" = "penjualan"."subtotal" - "penjualan"."diskon_nota"),
	CONSTRAINT "penjualan_batal_check" CHECK ("penjualan"."status" <> 'batal' OR ("penjualan"."alasan_batal" IS NOT NULL AND "penjualan"."dibatalkan_oleh" IS NOT NULL AND "penjualan"."dibatalkan_pada" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "penjualan_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"penjualan_id" uuid NOT NULL,
	"produk_id" uuid NOT NULL,
	"nama_produk" text NOT NULL,
	"qty" integer NOT NULL,
	"harga_satuan" integer NOT NULL,
	"diskon_item" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL,
	"hpp_satuan" numeric(14, 2) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "penjualan_item_qty_check" CHECK ("penjualan_item"."qty" > 0),
	CONSTRAINT "penjualan_item_subtotal_check" CHECK ("penjualan_item"."subtotal" = "penjualan_item"."qty" * "penjualan_item"."harga_satuan" - "penjualan_item"."diskon_item"),
	CONSTRAINT "penjualan_item_diskon_check" CHECK ("penjualan_item"."diskon_item" >= 0 AND "penjualan_item"."diskon_item" <= "penjualan_item"."qty" * "penjualan_item"."harga_satuan")
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_invoice" text NOT NULL,
	"pre_order_id" uuid,
	"penjualan_id" uuid,
	"tanggal" date NOT NULL,
	"jatuh_tempo" date,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_no_invoice_unique" UNIQUE("no_invoice"),
	CONSTRAINT "invoice_satu_sumber_check" CHECK (num_nonnulls("invoice"."pre_order_id", "invoice"."penjualan_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "po_pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_id" uuid NOT NULL,
	"jenis" "jenis_bayar_po" NOT NULL,
	"nominal" integer NOT NULL,
	"metode" "metode_bayar" NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	CONSTRAINT "po_pembayaran_nominal_check" CHECK ("po_pembayaran"."nominal" > 0)
);
--> statement-breakpoint
CREATE TABLE "pre_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_po" text NOT NULL,
	"nama_pemesan" text NOT NULL,
	"kontak" text NOT NULL,
	"tanggal_ambil" date NOT NULL,
	"jam_ambil" time,
	"diantar" boolean DEFAULT false NOT NULL,
	"alamat" text,
	"catatan" text,
	"status" "status_po" DEFAULT 'dipesan' NOT NULL,
	"total" integer NOT NULL,
	"diskon" integer DEFAULT 0 NOT NULL,
	"dibayar" integer DEFAULT 0 NOT NULL,
	"status_bayar" "status_bayar" DEFAULT 'belum' NOT NULL,
	"alasan_batal" text,
	"dibatalkan_pada" timestamp with time zone,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_order_no_po_unique" UNIQUE("no_po"),
	CONSTRAINT "pre_order_batal_check" CHECK ("pre_order"."status" <> 'batal' OR ("pre_order"."alasan_batal" IS NOT NULL AND "pre_order"."dibatalkan_pada" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pre_order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_id" uuid NOT NULL,
	"produk_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	"harga_satuan" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"catatan_kue" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_order_item_qty_check" CHECK ("pre_order_item"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "pembelian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_pembelian" text NOT NULL,
	"tanggal" date NOT NULL,
	"supplier_id" uuid,
	"akun_bayar" "akun_kas" NOT NULL,
	"total" integer NOT NULL,
	"status" "status_trx" DEFAULT 'selesai' NOT NULL,
	"alasan_batal" text,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pembelian_no_pembelian_unique" UNIQUE("no_pembelian")
);
--> statement-breakpoint
CREATE TABLE "pembelian_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pembelian_id" uuid NOT NULL,
	"bahan_id" uuid NOT NULL,
	"jumlah_kemasan" numeric(14, 3) NOT NULL,
	"isi_per_kemasan" numeric(14, 3) NOT NULL,
	"qty_dasar" numeric(14, 3) NOT NULL,
	"total_harga" integer NOT NULL,
	"harga_per_satuan" numeric(14, 4) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pembelian_item_jumlah_kemasan_check" CHECK ("pembelian_item"."jumlah_kemasan" > 0),
	CONSTRAINT "pembelian_item_isi_per_kemasan_check" CHECK ("pembelian_item"."isi_per_kemasan" > 0),
	CONSTRAINT "pembelian_item_total_harga_check" CHECK ("pembelian_item"."total_harga" >= 0)
);
--> statement-breakpoint
CREATE TABLE "produksi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_produksi" text NOT NULL,
	"tanggal" date NOT NULL,
	"resep_adonan_id" uuid NOT NULL,
	"faktor_skala" numeric(6, 3) NOT NULL,
	"biaya_adonan" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "status_produksi" DEFAULT 'draft' NOT NULL,
	"catatan" text,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produksi_no_produksi_unique" UNIQUE("no_produksi"),
	CONSTRAINT "produksi_faktor_skala_check" CHECK ("produksi"."faktor_skala" > 0)
);
--> statement-breakpoint
CREATE TABLE "produksi_hasil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produksi_id" uuid NOT NULL,
	"produk_id" uuid NOT NULL,
	"pcs_rencana" integer NOT NULL,
	"pcs_aktual" integer NOT NULL,
	"pcs_afkir" integer NOT NULL,
	"hpp_rencana" numeric(14, 2) NOT NULL,
	"hpp_aktual" numeric(14, 2) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produksi_hasil_produksi_produk_unique" UNIQUE("produksi_id","produk_id"),
	CONSTRAINT "produksi_hasil_pcs_check" CHECK ("produksi_hasil"."pcs_rencana" >= 0 AND "produksi_hasil"."pcs_aktual" >= 0 AND "produksi_hasil"."pcs_afkir" >= 0)
);
--> statement-breakpoint
CREATE TABLE "riwayat_harga" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bahan_id" uuid NOT NULL,
	"harga_lama" numeric(14, 4) NOT NULL,
	"harga_beli" numeric(14, 4),
	"harga_baru" numeric(14, 4) NOT NULL,
	"sumber" "sumber_harga" NOT NULL,
	"pembelian_item_id" uuid,
	"berlaku_sejak" timestamp with time zone DEFAULT now() NOT NULL,
	"dibuat_oleh" uuid NOT NULL,
	CONSTRAINT "riwayat_harga_sumber_pembelian_check" CHECK ("riwayat_harga"."sumber" <> 'pembelian' OR "riwayat_harga"."pembelian_item_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "stok_mutasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	"jenis" "jenis_mutasi" NOT NULL,
	"bahan_id" uuid,
	"produk_id" uuid,
	"qty" numeric(14, 3) NOT NULL,
	"saldo_sesudah" numeric(14, 3) NOT NULL,
	"nilai_satuan" numeric(14, 4) NOT NULL,
	"alasan" text,
	"sumber_tipe" "sumber_tipe",
	"sumber_id" uuid,
	"dibuat_oleh" uuid NOT NULL,
	CONSTRAINT "stok_mutasi_satu_target_check" CHECK (num_nonnulls("stok_mutasi"."bahan_id", "stok_mutasi"."produk_id") = 1),
	CONSTRAINT "stok_mutasi_qty_check" CHECK ("stok_mutasi"."qty" <> 0),
	CONSTRAINT "stok_mutasi_alasan_penyesuaian_check" CHECK ("stok_mutasi"."jenis" <> 'penyesuaian' OR nullif(btrim("stok_mutasi"."alasan"), '') IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "stok_opname" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tanggal" date NOT NULL,
	"target" "target_opname" NOT NULL,
	"status" "status_opname" DEFAULT 'draft' NOT NULL,
	"catatan" text,
	"dibuat_oleh" uuid NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stok_opname_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stok_opname_id" uuid NOT NULL,
	"bahan_id" uuid,
	"produk_id" uuid,
	"stok_sistem" numeric(14, 3) NOT NULL,
	"stok_fisik" numeric(14, 3) NOT NULL,
	"selisih" numeric(14, 3) NOT NULL,
	"nilai_selisih" numeric(14, 4) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stok_opname_item_satu_target_check" CHECK (num_nonnulls("stok_opname_item"."bahan_id", "stok_opname_item"."produk_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "kas" ADD CONSTRAINT "kas_kategori_kas_id_kategori_kas_id_fk" FOREIGN KEY ("kategori_kas_id") REFERENCES "public"."kategori_kas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas" ADD CONSTRAINT "kas_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_pre_order_id_pre_order_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."pre_order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_dibatalkan_oleh_pengguna_id_fk" FOREIGN KEY ("dibatalkan_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD CONSTRAINT "penjualan_item_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penjualan_item" ADD CONSTRAINT "penjualan_item_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_pre_order_id_pre_order_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."pre_order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_penjualan_id_penjualan_id_fk" FOREIGN KEY ("penjualan_id") REFERENCES "public"."penjualan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_pembayaran" ADD CONSTRAINT "po_pembayaran_pre_order_id_pre_order_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."pre_order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_pembayaran" ADD CONSTRAINT "po_pembayaran_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order" ADD CONSTRAINT "pre_order_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_item" ADD CONSTRAINT "pre_order_item_pre_order_id_pre_order_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."pre_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_item" ADD CONSTRAINT "pre_order_item_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembelian" ADD CONSTRAINT "pembelian_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembelian" ADD CONSTRAINT "pembelian_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembelian_item" ADD CONSTRAINT "pembelian_item_pembelian_id_pembelian_id_fk" FOREIGN KEY ("pembelian_id") REFERENCES "public"."pembelian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembelian_item" ADD CONSTRAINT "pembelian_item_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi" ADD CONSTRAINT "produksi_resep_adonan_id_resep_adonan_id_fk" FOREIGN KEY ("resep_adonan_id") REFERENCES "public"."resep_adonan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi" ADD CONSTRAINT "produksi_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi_hasil" ADD CONSTRAINT "produksi_hasil_produksi_id_produksi_id_fk" FOREIGN KEY ("produksi_id") REFERENCES "public"."produksi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi_hasil" ADD CONSTRAINT "produksi_hasil_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_harga" ADD CONSTRAINT "riwayat_harga_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_harga" ADD CONSTRAINT "riwayat_harga_pembelian_item_id_pembelian_item_id_fk" FOREIGN KEY ("pembelian_item_id") REFERENCES "public"."pembelian_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riwayat_harga" ADD CONSTRAINT "riwayat_harga_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_dibuat_oleh_pengguna_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_stok_opname_id_stok_opname_id_fk" FOREIGN KEY ("stok_opname_id") REFERENCES "public"."stok_opname"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kas_waktu_idx" ON "kas" USING btree ("waktu");--> statement-breakpoint
CREATE INDEX "kas_akun_idx" ON "kas" USING btree ("akun");--> statement-breakpoint
CREATE INDEX "kas_sumber_idx" ON "kas" USING btree ("sumber_tipe","sumber_id");--> statement-breakpoint
CREATE INDEX "penjualan_waktu_idx" ON "penjualan" USING btree ("waktu");--> statement-breakpoint
CREATE INDEX "pre_order_tanggal_ambil_idx" ON "pre_order" USING btree ("tanggal_ambil");--> statement-breakpoint
CREATE INDEX "pre_order_status_idx" ON "pre_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "riwayat_harga_bahan_berlaku_idx" ON "riwayat_harga" USING btree ("bahan_id","berlaku_sejak" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stok_mutasi_bahan_waktu_idx" ON "stok_mutasi" USING btree ("bahan_id","waktu");--> statement-breakpoint
CREATE INDEX "stok_mutasi_produk_waktu_idx" ON "stok_mutasi" USING btree ("produk_id","waktu");--> statement-breakpoint
CREATE INDEX "stok_mutasi_sumber_idx" ON "stok_mutasi" USING btree ("sumber_tipe","sumber_id");