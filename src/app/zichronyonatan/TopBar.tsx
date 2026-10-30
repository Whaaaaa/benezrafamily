import Link from "next/link";
import FlameMark from "./FlameMark";

export function ZyNav() {
  return (
    <nav className="zy-nav" aria-label="Zichron Yonatan">
      <Link href="/zichronyonatan">Archive</Link>
      <Link href="/zichronyonatan/upload">Upload a Dvar Torah</Link>
      <Link href="/zichronyonatan/manage">Manage</Link>
      <Link href="/zichronyonatan/admin">Mailing list</Link>
    </nav>
  );
}

export default function TopBar() {
  return (
    <div className="zy-topbar">
      <div className="zy-topbar-inner">
        <Link href="/zichronyonatan" className="zy-topbar-link">
          <FlameMark />
          Zichron Yonatan
        </Link>
        <ZyNav />
      </div>
    </div>
  );
}
