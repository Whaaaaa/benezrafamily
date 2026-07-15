import "./styles.css";

export const metadata = {
  title: "Zichron Yonatan | A Family Torah Archive",
  description:
    "Weekly divrei Torah written in loving memory of Yonatan ben Avraham Avinu a\"h, collected across the Torah's parshiot and holidays.",
};

export default function ZichronYonatanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
