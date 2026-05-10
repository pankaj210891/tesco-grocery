export const siteConfig = {
  name: "Prakash Supermarket",
  description: "Fresh food, quality products and everyday value — all in one place.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/images/og.png",
  links: {
    github: "https://github.com",
  },
} as const;
