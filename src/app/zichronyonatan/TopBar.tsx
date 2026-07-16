import Link from "next/link";
import FlameMark from "./FlameMark";

export default function TopBar() {
  return (
    <div className="zy-topbar">
      <div className="zy-topbar-inner">
        <Link href="/zichronyonatan" className="zy-topbar-link">
          <FlameMark />
          Zichron Yonatan
        </Link>
      </div>
    </div>
  );
}
