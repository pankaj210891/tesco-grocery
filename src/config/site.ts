export const siteConfig = {
  name:        process.env.NEXT_PUBLIC_APP_NAME       ?? "Prakash Supermarket",
  shortName:   process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? "Prakash",
  tagline:     process.env.NEXT_PUBLIC_APP_TAGLINE    ?? "Online Grocery Store",
  description: "Fresh food, quality products and everyday value — all in one place.",
  url:         process.env.NEXT_PUBLIC_APP_URL        ?? "http://localhost:3000",
  ogImage: "/images/og.png",
  links: {
    github: "https://github.com",
  },
} as const;
