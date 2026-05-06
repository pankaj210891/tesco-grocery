export const siteConfig = {
  name: "Tesco Grocery",
  description: "Fresh food, quality products, everyday low prices.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/images/og.png",
  links: {
    github: "https://github.com",
  },
} as const;
