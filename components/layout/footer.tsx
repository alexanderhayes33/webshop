export function SiteFooter() {
  return (
    <footer className="border-t mt-12">
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-4 text-xs text-muted-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              168VAPE
            </p>
            <p className="max-w-sm text-[11px]">
              ร้านขายพอตและอุปกรณ์อิเล็กทรอนิกส์สำหรับสูบ จำหน่ายสินค้าคุณภาพ
              พร้อมบริการจัดส่งรวดเร็ว
            </p>
          </div>
          <div className="flex gap-8 text-[11px]">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">สินค้า</p>
              <p>พอตและอุปกรณ์</p>
              <p>น้ำยาสำหรับพอต</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">บริการ</p>
              <p>จัดส่งภายใน 24 ชั่วโมง</p>
              <p>สินค้าใหม่อัปเดตทุกสัปดาห์</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground/80 md:flex-row">
          <span>
            © {new Date().getFullYear()} 168VAPE. สงวนลิขสิทธิ์ทั้งหมด
          </span>
          <span>ร้านขายพอตและอุปกรณ์อิเล็กทรอนิกส์สำหรับสูบ</span>
        </div>
      </div>
    </footer>
  );
}

