import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") || "localhost:3000";
  const base = new URL(`${host.startsWith("localhost") ? "http" : "https"}://${host}`);
  const description = "选择历史剧本与开国班底，在五百年的四季事件中经营人口、钱粮、武备、民情与吏治。";
  return {
    metadataBase: base,
    title: "五百年王朝｜四时治世",
    description,
    openGraph: { title: "五百年王朝｜四时治世", description, type: "website", images: [{ url: "/og.png", width: 1728, height: 908, alt: "五百年王朝，四时治世" }] },
    twitter: { card: "summary_large_image", title: "五百年王朝｜四时治世", description, images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
