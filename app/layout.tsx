import "./globals.css";

export const metadata = {
  title: "IELTS Speaking AI Coach",
  description: "Practice IELTS Speaking with AI feedback",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

