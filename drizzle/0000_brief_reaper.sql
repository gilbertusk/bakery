CREATE TYPE "public"."aksi_audit" AS ENUM('insert', 'update', 'batal');--> statement-breakpoint
CREATE TYPE "public"."akun_kas" AS ENUM('tunai', 'rekening');--> statement-breakpoint
CREATE TYPE "public"."bentuk_loyang" AS ENUM('bulat', 'kotak');--> statement-breakpoint
CREATE TYPE "public"."jenis_bayar_po" AS ENUM('dp', 'pelunasan', 'refund');--> statement-breakpoint
CREATE TYPE "public"."jenis_kas" AS ENUM('masuk', 'keluar');--> statement-breakpoint
CREATE TYPE "public"."jenis_mutasi" AS ENUM('stok_awal', 'pembelian', 'batal_pembelian', 'produksi_pakai', 'produksi_hasil', 'batal_produksi', 'penjualan', 'batal_penjualan', 'penyesuaian', 'opname');--> statement-breakpoint
CREATE TYPE "public"."kelompok_kas" AS ENUM('penjualan', 'pendapatan_lain', 'hpp_bahan', 'operasional', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."metode_bayar" AS ENUM('tunai', 'transfer', 'qris');--> statement-breakpoint
CREATE TYPE "public"."metode_biaya" AS ENUM('per_pcs', 'persen', 'per_batch');--> statement-breakpoint
CREATE TYPE "public"."metode_harga" AS ENUM('rata_rata', 'terakhir');--> statement-breakpoint
CREATE TYPE "public"."mode_hasil" AS ENUM('otomatis', 'timbang');--> statement-breakpoint
CREATE TYPE "public"."peran" AS ENUM('pemilik', 'kasir');--> statement-breakpoint
CREATE TYPE "public"."peran_komponen" AS ENUM('adonan', 'topping', 'filling', 'kemasan', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."satuan_dasar" AS ENUM('g', 'ml', 'pcs');--> statement-breakpoint
CREATE TYPE "public"."status_bayar" AS ENUM('belum', 'dp', 'lunas');--> statement-breakpoint
CREATE TYPE "public"."status_opname" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."status_po" AS ENUM('dipesan', 'diproduksi', 'siap', 'diambil', 'batal');--> statement-breakpoint
CREATE TYPE "public"."status_produksi" AS ENUM('draft', 'selesai', 'batal');--> statement-breakpoint
CREATE TYPE "public"."status_trx" AS ENUM('selesai', 'batal');--> statement-breakpoint
CREATE TYPE "public"."sumber_harga" AS ENUM('pembelian', 'manual');--> statement-breakpoint
CREATE TYPE "public"."sumber_tipe" AS ENUM('pembelian', 'produksi', 'penjualan', 'opname', 'po_pembayaran', 'transfer', 'manual');--> statement-breakpoint
CREATE TYPE "public"."target_opname" AS ENUM('bahan', 'produk');--> statement-breakpoint
CREATE TYPE "public"."ukuran_kertas" AS ENUM('58', '80');--> statement-breakpoint
CREATE TABLE "bahan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"kategori" text NOT NULL,
	"satuan_dasar" "satuan_dasar" NOT NULL,
	"harga_per_satuan" numeric(14, 4) DEFAULT '0' NOT NULL,
	"stok" numeric(14, 3) DEFAULT '0' NOT NULL,
	"stok_minimal" numeric(14, 3) DEFAULT '0' NOT NULL,
	"supplier_utama_id" uuid,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bahan_harga_per_satuan_check" CHECK ("bahan"."harga_per_satuan" >= 0),
	CONSTRAINT "bahan_stok_minimal_check" CHECK ("bahan"."stok_minimal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "konversi_satuan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bahan_id" uuid NOT NULL,
	"nama_satuan" text NOT NULL,
	"nilai_dasar" numeric(12, 4) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "konversi_satuan_nilai_dasar_check" CHECK ("konversi_satuan"."nilai_dasar" > 0)
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"kontak" text,
	"catatan" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biaya_tambahan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"metode" "metode_biaya" NOT NULL,
	"nilai" numeric(14, 4) NOT NULL,
	"produk_id" uuid,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biaya_tambahan_nilai_check" CHECK ("biaya_tambahan"."nilai" >= 0),
	CONSTRAINT "biaya_tambahan_persen_check" CHECK ("biaya_tambahan"."metode" <> 'persen' OR "biaya_tambahan"."nilai" <= 1)
);
--> statement-breakpoint
CREATE TABLE "produk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"kategori" text NOT NULL,
	"cetakan" text,
	"harga_jual" integer NOT NULL,
	"target_margin" numeric(5, 4),
	"stok" integer DEFAULT 0 NOT NULL,
	"foto_url" text,
	"dijual" boolean DEFAULT true NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produk_harga_jual_check" CHECK ("produk"."harga_jual" >= 0),
	CONSTRAINT "produk_target_margin_check" CHECK ("produk"."target_margin" IS NULL OR ("produk"."target_margin" >= 0 AND "produk"."target_margin" <= 0.95))
);
--> statement-breakpoint
CREATE TABLE "produk_komponen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produk_id" uuid NOT NULL,
	"peran" "peran_komponen" NOT NULL,
	"resep_adonan_id" uuid,
	"bahan_id" uuid,
	"takaran" numeric(14, 3) NOT NULL,
	"konversi_satuan_id" uuid,
	"takaran_dasar" numeric(14, 3) NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produk_komponen_satu_sumber_check" CHECK (num_nonnulls("produk_komponen"."resep_adonan_id", "produk_komponen"."bahan_id") = 1),
	CONSTRAINT "produk_komponen_peran_adonan_check" CHECK ("produk_komponen"."peran" <> 'adonan' OR "produk_komponen"."resep_adonan_id" IS NOT NULL),
	CONSTRAINT "produk_komponen_takaran_check" CHECK ("produk_komponen"."takaran" > 0)
);
--> statement-breakpoint
CREATE TABLE "resep_adonan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"mode_hasil" "mode_hasil" NOT NULL,
	"hasil_gram" numeric(14, 3) NOT NULL,
	"cara_buat" text,
	"bentuk_loyang" "bentuk_loyang",
	"diameter_cm" numeric(8, 2),
	"panjang_cm" numeric(8, 2),
	"lebar_cm" numeric(8, 2),
	"induk_resep_id" uuid,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resep_adonan_hasil_gram_check" CHECK ("resep_adonan"."hasil_gram" > 0),
	CONSTRAINT "resep_adonan_loyang_check" CHECK (("resep_adonan"."bentuk_loyang" IS NULL)
        OR ("resep_adonan"."bentuk_loyang" = 'bulat' AND "resep_adonan"."diameter_cm" IS NOT NULL)
        OR ("resep_adonan"."bentuk_loyang" = 'kotak' AND "resep_adonan"."panjang_cm" IS NOT NULL AND "resep_adonan"."lebar_cm" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "resep_adonan_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resep_adonan_id" uuid NOT NULL,
	"bahan_id" uuid NOT NULL,
	"takaran" numeric(14, 3) NOT NULL,
	"konversi_satuan_id" uuid,
	"takaran_dasar" numeric(14, 3) NOT NULL,
	"urutan" integer NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resep_adonan_item_takaran_check" CHECK ("resep_adonan_item"."takaran" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	"pengguna_id" uuid NOT NULL,
	"tabel" text NOT NULL,
	"record_id" uuid NOT NULL,
	"aksi" "aksi_audit" NOT NULL,
	"data_lama" jsonb,
	"data_baru" jsonb
);
--> statement-breakpoint
CREATE TABLE "nomor_urut" (
	"prefix" text NOT NULL,
	"tanggal" date NOT NULL,
	"terakhir" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "nomor_urut_prefix_tanggal_pk" PRIMARY KEY("prefix","tanggal")
);
--> statement-breakpoint
CREATE TABLE "pengaturan_toko" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nama_toko" text DEFAULT 'Toko Kue Khansa' NOT NULL,
	"alamat" text,
	"telepon" text,
	"logo_url" text,
	"footer_struk" text DEFAULT 'Terima kasih, selamat menikmati!' NOT NULL,
	"info_pembayaran" text,
	"ukuran_kertas" "ukuran_kertas" DEFAULT '58' NOT NULL,
	"metode_harga" "metode_harga" DEFAULT 'rata_rata' NOT NULL,
	"target_margin_default" numeric(5, 4) DEFAULT '0.3000' NOT NULL,
	"izinkan_stok_produk_minus" boolean DEFAULT false NOT NULL,
	"pembulatan_saran_harga" integer DEFAULT 500 NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pengaturan_toko_id_check" CHECK ("pengaturan_toko"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "pengguna" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"peran" "peran" DEFAULT 'kasir' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pengguna_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bahan" ADD CONSTRAINT "bahan_supplier_utama_id_supplier_id_fk" FOREIGN KEY ("supplier_utama_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konversi_satuan" ADD CONSTRAINT "konversi_satuan_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biaya_tambahan" ADD CONSTRAINT "biaya_tambahan_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produk_komponen" ADD CONSTRAINT "produk_komponen_produk_id_produk_id_fk" FOREIGN KEY ("produk_id") REFERENCES "public"."produk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produk_komponen" ADD CONSTRAINT "produk_komponen_resep_adonan_id_resep_adonan_id_fk" FOREIGN KEY ("resep_adonan_id") REFERENCES "public"."resep_adonan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produk_komponen" ADD CONSTRAINT "produk_komponen_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produk_komponen" ADD CONSTRAINT "produk_komponen_konversi_satuan_id_konversi_satuan_id_fk" FOREIGN KEY ("konversi_satuan_id") REFERENCES "public"."konversi_satuan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep_adonan" ADD CONSTRAINT "resep_adonan_induk_resep_id_fk" FOREIGN KEY ("induk_resep_id") REFERENCES "public"."resep_adonan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep_adonan_item" ADD CONSTRAINT "resep_adonan_item_resep_adonan_id_resep_adonan_id_fk" FOREIGN KEY ("resep_adonan_id") REFERENCES "public"."resep_adonan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep_adonan_item" ADD CONSTRAINT "resep_adonan_item_bahan_id_bahan_id_fk" FOREIGN KEY ("bahan_id") REFERENCES "public"."bahan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resep_adonan_item" ADD CONSTRAINT "resep_adonan_item_konversi_satuan_id_konversi_satuan_id_fk" FOREIGN KEY ("konversi_satuan_id") REFERENCES "public"."konversi_satuan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_pengguna_id_pengguna_id_fk" FOREIGN KEY ("pengguna_id") REFERENCES "public"."pengguna"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bahan_nama_unique" ON "bahan" USING btree (lower("nama"));--> statement-breakpoint
CREATE UNIQUE INDEX "konversi_satuan_bahan_nama_unique" ON "konversi_satuan" USING btree ("bahan_id",lower("nama_satuan"));--> statement-breakpoint
CREATE UNIQUE INDEX "produk_nama_unique" ON "produk" USING btree (lower("nama"));--> statement-breakpoint
CREATE UNIQUE INDEX "resep_adonan_nama_unique" ON "resep_adonan" USING btree (lower("nama"));--> statement-breakpoint
CREATE INDEX "audit_log_tabel_record_id_idx" ON "audit_log" USING btree ("tabel","record_id");--> statement-breakpoint
CREATE INDEX "audit_log_waktu_idx" ON "audit_log" USING btree ("waktu" DESC NULLS LAST);
