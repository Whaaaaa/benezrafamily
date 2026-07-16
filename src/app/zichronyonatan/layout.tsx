import "./styles.css";

export const metadata = {
  title: "Zichron Yonatan | A Family Torah Archive",
  description:
    "Weekly divrei Torah written in loving memory of Yonatan ben Avraham Avinu a\"h, reproduced word-for-word from the family's original documents.",
};

export default function ZichronYonatanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="zy-root">
        <a href="#zy-content" className="zy-skip-link">
          Skip to content
        </a>
        {children}
        <footer className="zy-site-footer">
          <p>
            The learning on this site should be a merit for the neshama of
            Yonatan ben Avraham Avinu a&quot;h.
          </p>
        </footer>
      </body>
    </html>
  );
}
