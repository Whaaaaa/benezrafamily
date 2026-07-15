export default function NotFound() {
  return (
    <div className="zy-main" style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Not Found</h1>
      <p style={{ marginBottom: "2rem" }}>The page you're looking for doesn't exist in the Zichron Yonatan archive.</p>
      <a href="/zichronyonatan" style={{ color: "#e3a75e", textDecoration: "underline" }}>
        Back to Zichron Yonatan
      </a>
    </div>
  );
}
